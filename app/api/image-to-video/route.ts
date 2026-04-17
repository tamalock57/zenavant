import OpenAI from "openai";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function toBytes(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

async function normalizeImage(
  file: File,
  width: number,
  height: number,
  fitMode: "preserve" | "fill"
) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  if (fitMode === "fill") {
    return sharp(inputBuffer)
      .resize(width, height, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();
  }

  return sharp(inputBuffer)
    .resize(width, height, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
      position: "centre",
    })
    .png()
    .toBuffer();
}

async function buildCompositeReference(
  mainFile: File,
  referenceFiles: File[],
  size: "1280x720" | "720x1280",
  fitMode: "preserve" | "fill"
) {
  const [width, height] = size.split("x").map(Number);

  if (referenceFiles.length === 0) {
    return normalizeImage(mainFile, width, height, fitMode);
  }

  const stripHeight = size === "720x1280" ? 220 : 180;
  const mainHeight = height - stripHeight;

  const mainBuffer = await normalizeImage(mainFile, width, mainHeight, fitMode);

  const refs = referenceFiles.slice(0, 4);
  const refWidth = Math.floor(width / refs.length);

  const refBuffers = await Promise.all(
    refs.map((file) =>
      normalizeImage(file, refWidth, stripHeight, fitMode)
    )
  );

  const refComposites = refBuffers.map((buffer, index) => ({
    input: buffer,
    left: index * refWidth,
    top: mainHeight,
  }));

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: mainBuffer, left: 0, top: 0 }, ...refComposites])
    .png()
    .toBuffer();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const prompt = String(form.get("prompt") ?? "").trim();
    const seconds = String(form.get("seconds") ?? "8") as "4" | "8" | "12";
    const size = String(form.get("size") ?? "1280x720") as
      | "1280x720"
      | "720x1280";
    const model = String(form.get("model") ?? "sora-2");
    const fitMode = String(form.get("fitMode") ?? "preserve") as
      | "preserve"
      | "fill";

    const numOutputs = Math.min(
      3,
      Math.max(1, Number(form.get("numOutputs") ?? 1))
    );

    const referenceFiles = (form.getAll("references") as File[]).filter(
      Boolean
    );

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY on server", 500);
    }

    if (!file) return jsonError("Missing main image");
    if (!prompt) return jsonError("Missing prompt");

    const compositeBuffer = await buildCompositeReference(
      file,
      referenceFiles,
      size,
      fitMode
    );

    const base64 = compositeBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    // 🔥 MULTI OUTPUT JOB CREATION
    const jobs = await Promise.all(
      Array.from({ length: numOutputs }).map(() =>
        openai.videos.create({
          model,
          prompt,
          seconds,
          size,
          input_reference: {
            image_url: dataUrl,
          } as any,
        } as any)
      )
    );

    const ids = jobs.map((job) => job.id);
    const first = jobs[0];

    if (ids.length === 1) {
      return Response.json({
        id: first.id,
        status: first.status,
        progress: first.progress ?? 0,
      });
    }

    return Response.json({
      ids,
      status: first.status,
      progress: first.progress ?? 0,
    });
  } catch (err: any) {
    console.error("POST image-to-video error:", err);
    return Response.json(
      { error: err?.message ?? "Image-to-video failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("Missing id");

    const job = await openai.videos.retrieve(id);

    if (job.status === "failed") {
      return Response.json({
        status: "failed",
        progress: job.progress ?? 0,
        error: job.error?.message ?? "Image-to-video failed",
      });
    }

    if (job.status !== "completed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
      });
    }

    const storagePath = `videos/image-to-video-${id}.mp4`;

    const { data: existingRow } = await supabaseAdmin
      .from("media")
      .select("url")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingRow?.url) {
      return Response.json({
        status: "completed",
        progress: 100,
        downloadUrl: existingRow.url,
      });
    }

    const contentRes = await fetch(
      `https://api.openai.com/v1/videos/${id}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (!contentRes.ok) {
      const text = await contentRes.text();
      return jsonError("Failed to download video content", 500);
    }

    const buf = await contentRes.arrayBuffer();

    await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, toBytes(buf), {
        contentType: "video/mp4",
        upsert: true,
      });

    const { data } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    const url = data.publicUrl;

    await supabaseAdmin.from("media").upsert(
      {
        type: "image_to_video",
        prompt: job.prompt ?? "",
        url,
        storage_path: storagePath,
      },
      { onConflict: "storage_path" }
    );

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl: url,
    });
  } catch (err: any) {
    console.error("GET image-to-video error:", err);
    return Response.json(
      { error: err?.message ?? "Image-to-video status failed" },
      { status: 500 }
    );
  }
}