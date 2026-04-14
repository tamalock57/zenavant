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

function toDataUrl(mime: string, base64: string) {
  return `data:${mime};base64,${base64}`;
}

function getTargetSize(size: string) {
  if (size === "720x1280") {
    return { width: 720, height: 1280 };
  }

  return { width: 1280, height: 720 };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const prompt = String(form.get("prompt") ?? "").trim();
    const seconds = String(form.get("seconds") ?? "8").trim() as "4" | "8" | "12";
    const size = String(form.get("size") ?? "1280x720").trim() as
      | "1280x720"
      | "720x1280";
    const model = String(form.get("model") ?? "sora-2").trim() as
      | "sora-2"
      | "sora-2-pro";

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY on server", 500);
    }

    if (!file) return jsonError("Missing image");
    if (!prompt) return jsonError("Missing prompt");

    if (!file.type.startsWith("image/")) {
      return jsonError("Uploaded file must be an image");
    }

    if (!["4", "8", "12"].includes(seconds)) {
      return jsonError("Seconds must be 4, 8, or 12");
    }

    if (!["1280x720", "720x1280"].includes(size)) {
      return jsonError("Size must be 1280x720 or 720x1280");
    }

    if (!["sora-2", "sora-2-pro"].includes(model)) {
      return jsonError("Model must be sora-2 or sora-2-pro");
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const { width, height } = getTargetSize(size);

    // Resize + center crop so the uploaded image always matches the requested video size.
    // "cover" preserves the image without distortion, cropping only what is needed.
    const processedBuffer = await sharp(inputBuffer)
      .resize(width, height, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();

    const base64 = processedBuffer.toString("base64");
    const dataUrl = toDataUrl("image/png", base64);

    const job = await openai.videos.create({
      model,
      prompt,
      seconds,
      size,
      input_reference: {
        image_url: dataUrl,
      } as any,
    } as any);

    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
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

    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("media")
      .select("id, url, storage_path")
      .eq("type", "image_to_video")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingError) {
      return Response.json(
        {
          error: "Failed to check existing video",
          details: existingError.message,
        },
        { status: 500 }
      );
    }

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
      const text = await contentRes.text().catch(() => "");
      return Response.json(
        {
          error: "Failed to download video content",
          details: text,
        },
        { status: 500 }
      );
    }

    const buf = await contentRes.arrayBuffer();

    const upload = await supabaseAdmin.storage.from("media").upload(
      storagePath,
      toBytes(buf),
      {
        contentType: "video/mp4",
        upsert: true,
      }
    );

    if (upload.error) {
      return Response.json(
        {
          error: "Supabase upload failed",
          details: upload.error.message,
        },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);
    const url = data.publicUrl;

    if (!url) {
      return Response.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    const { error: upsertError } = await supabaseAdmin
  .from("media")
  .upsert(
    {
      type: "image_to_video",
      prompt: job.prompt ?? "",
      url,
      storage_path: storagePath,
    },
    {
      onConflict: "storage_path",
    }
  );

if (upsertError) {
  return Response.json(
    {
      error: "DB upsert failed",
      details: upsertError.message,
    },
    { status: 500 }
  );
}


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