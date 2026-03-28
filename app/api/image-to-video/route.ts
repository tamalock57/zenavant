import OpenAI from "openai";
import { toFile } from "openai/uploads";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ModelName = "sora-2" | "sora-2-pro";
type SizeLabel = "720x1280" | "1280x720" | "1024x1792" | "1792x1024";

function arrayBufferToUint8Array(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

function parseModel(raw: unknown): ModelName {
  return raw === "sora-2-pro" ? "sora-2-pro" : "sora-2";
}

function parseSeconds(raw: unknown): "4" | "8" | "12" {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s === "4" || s === "12") return s;
  return "8";
}

function parseSize(
  raw: unknown,
  model: ModelName
): { label: SizeLabel; w: number; h: number } {
  const allowedSora2: SizeLabel[] = ["720x1280", "1280x720"];
  const allowedPro: SizeLabel[] = ["720x1280", "1024x1792", "1280x720", "1792x1024"];
  const allowed = model === "sora-2-pro" ? allowedPro : allowedSora2;

  const incoming = typeof raw === "string" ? (raw.trim() as SizeLabel) : undefined;

  const label: SizeLabel =
    incoming && allowed.includes(incoming)
      ? incoming
      : model === "sora-2-pro"
        ? "1024x1792"
        : "1280x720";

  const [wStr, hStr] = label.split("x");

  return {
    label,
    w: Number(wStr),
    h: Number(hStr),
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();

    // Accept either "file" or "image" from mobile
    const file = formData.get("file") ?? formData.get("image");
    const promptRaw = formData.get("prompt");
    const secondsRaw = formData.get("seconds");
    const sizeRaw = formData.get("size");
    const modelRaw = formData.get("model");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing image file" }, { status: 400 });
    }

    const prompt =
      typeof promptRaw === "string"
        ? promptRaw.trim()
        : String(promptRaw ?? "").trim();

    if (prompt.length < 3) {
      return Response.json({ error: "Missing or too-short prompt" }, { status: 400 });
    }

    const model = parseModel(modelRaw);
    const seconds = parseSeconds(secondsRaw);
    const sizeObj = parseSize(sizeRaw, model);

    const inputBytes = new Uint8Array(await file.arrayBuffer());

    const resizedPng = await sharp(inputBytes)
      .resize(sizeObj.w, sizeObj.h, {
        fit: "cover",
        position: "center",
      })
      .png()
      .toBuffer();

    const uploadable = await toFile(
      resizedPng,
      `input-${sizeObj.label}.png`,
      { type: "image/png" }
    );

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const job = await client.videos.create({
      model,
      prompt,
      size: sizeObj.label,
      seconds,
      input_reference: uploadable,
    });

    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
    });
  } catch (error: any) {
    console.error("IMAGE->VIDEO POST ERROR:", error);

    return Response.json(
      {
        error: "Image-to-video job creation failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const job = await client.videos.retrieve(id);

    if (job.status === "failed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
        error: job.error?.message ?? "Video failed",
      });
    }

    if (job.status !== "completed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
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
      const txt = await contentRes.text().catch(() => "");
      return Response.json(
        {
          error: "Failed to download video content",
          details: txt,
        },
        { status: 500 }
      );
    }

    const buf = await contentRes.arrayBuffer();
    const bytes = arrayBufferToUint8Array(buf);

    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`;
    const storagePath = `videos/${filename}`;

    const upload = await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, bytes, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (upload.error) {
      return Response.json(
        {
          error: "Supabase upload failed",
          details: upload.error.message,
        },
        { status: 500 }
      );
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    const url = publicData?.publicUrl;

    if (!url) {
      return Response.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from("media").insert({
      type: "video",
      prompt: job.prompt ?? "",
      url,
      storage_path: storagePath,
    });

    if (dbError) {
      return Response.json(
        {
          error: "DB insert failed",
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl: url,
    });
  } catch (error: any) {
    console.error("IMAGE->VIDEO GET ERROR:", error);

    return Response.json(
      {
        error: "Status check failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}