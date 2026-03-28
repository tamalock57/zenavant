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

function arrayBufferToUint8Array(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

/**
 * POST /api/audio-to-video
 * Starts a video generation job and returns the job object (id, status, etc.)
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const prompt = String(formData.get("prompt") ?? "").trim();
    const secondsRaw = String(formData.get("seconds") ?? "8").trim();
    const size = String(formData.get("size") ?? "1280x720").trim();

    // Kept for audio-first UX, even though not yet used in the Sora call
    // const audio = formData.get("audio") as File | null;

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY on server", 500);
    }

    if (!prompt) return jsonError("Missing prompt");

    if (!["4", "8", "12"].includes(secondsRaw)) {
      return jsonError("Seconds must be 4, 8, or 12");
    }

    if (!["1280x720", "720x1280"].includes(size)) {
      return jsonError("Size must be 1280x720 or 720x1280");
    }

    const job = await openai.videos.create({
      model: "sora-2-pro",
      prompt,
      seconds: secondsRaw as "4" | "8" | "12",
      size: size as "1280x720" | "720x1280",
    });

    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
    });
  } catch (err: any) {
    console.error("POST /api/audio-to-video error:", err);
    return Response.json(
      { error: "Video generation failed", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audio-to-video?id=VIDEO_ID
 * Returns status JSON until complete,
 * then downloads MP4, uploads to Supabase, and returns downloadUrl
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonError("Missing id");

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY on server", 500);
    }

    const job = await openai.videos.retrieve(id);

    if (job.status === "failed") {
      return Response.json({
        status: "failed",
        progress: job.progress ?? 0,
        error: job.error?.message ?? "Audio-video generation failed",
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
        { error: "Failed to download video content", details: txt },
        { status: 500 }
      );
    }

    const buf = await contentRes.arrayBuffer();
    const bytes = arrayBufferToUint8Array(buf);

    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`;
    const storagePath = `videos/${filename}`;

    const upload = await supabaseAdmin.storage.from("media").upload(storagePath, bytes, {
      contentType: "video/mp4",
      upsert: false,
    });

    if (upload.error) {
      return Response.json(
        { error: "Supabase upload failed", details: upload.error.message },
        { status: 500 }
      );
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    const downloadUrl = publicData?.publicUrl;

    if (!downloadUrl) {
      return Response.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from("media").insert({
      type: "video",
      prompt: job.prompt ?? "",
      url: downloadUrl,
      storage_path: storagePath,
    });

    if (dbError) {
      return Response.json(
        { error: "DB insert failed", details: dbError.message },
        { status: 500 }
      );
    }

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl,
    });
  } catch (err: any) {
    console.error("GET /api/audio-to-video error:", err);
    return Response.json(
      { error: "Failed to fetch video status/content", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}