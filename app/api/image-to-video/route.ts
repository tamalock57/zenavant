import OpenAI from "openai";
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

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const prompt = String(form.get("prompt") ?? "").trim();
    const seconds = String(form.get("seconds") ?? "8");
    const size = String(form.get("size") ?? "1280x720");
    const model = String(form.get("model") ?? "sora-2");

    if (!file) return jsonError("Missing image");
    if (!prompt) return jsonError("Missing prompt");

    const job = await openai.videos.create({
      model,
      prompt,
      seconds: seconds as any,
      size: size as any,
    });

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

    // Check existing DB row first
    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("media")
      .select("id, url, storage_path")
      .eq("type", "video")
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

    const { data } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    const url = data.publicUrl;

    if (!url) {
      return Response.json(
        { error: "Failed to get public URL" },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("media").insert({
      type: "video",
      prompt: job.prompt ?? "",
      url,
      storage_path: storagePath,
    });

    if (insertError) {
      return Response.json(
        {
          error: "DB insert failed",
          details: insertError.message,
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