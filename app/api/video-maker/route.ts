import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function arrayBufferToUint8Array(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = (body?.prompt ?? "").toString().trim();
    const size = (body?.size ?? "1280x720").toString();
    const seconds = (body?.seconds ?? "8").toString();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (prompt.length < 5) {
      return Response.json({ error: "Missing or too-short prompt" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ Create a VIDEO job (Sora)
    const job = await client.videos.create({
      model: "sora-2",          // or "sora-2-pro"
      prompt,
      size,                    // "1280x720", "720x1280", "1792x1024", "1024x1792"
      seconds,                 // "4" | "8" | "12"
    });

    // Return job id + status for polling
    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
    });
  } catch (error: any) {
    console.error("VIDEO POST ERROR:", error);
    return Response.json(
      { error: "Video job creation failed", details: error?.message ?? String(error) },
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

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ✅ Retrieve job status (queued / in_progress / completed / failed)
    const job = await client.videos.retrieve(id);

    // If failed, return the error message
    if (job.status === "failed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
        error: job.error?.message ?? "Video failed",
      });
    }

    // If still running, return status/progress
    if (job.status !== "completed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
      });
    }

    // ✅ Completed: download binary mp4 and upload to Supabase
    // Download endpoint is GET /videos/{video_id}/content :contentReference[oaicite:2]{index=2}
    const contentRes = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

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

    const { data: publicData } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);
    const url = publicData?.publicUrl;

    if (!url) {
      return Response.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from("media").insert({
      type: "video",
      prompt: job.prompt,
      url,
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
      downloadUrl: url,
    });
  } catch (error: any) {
    console.error("VIDEO GET ERROR:", error);
    return Response.json(
      { error: "Status check failed", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}