import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = (body?.prompt ?? "").toString().trim();
    const size = (body?.size ?? "1280x720").toString();
    const seconds = (body?.seconds ?? "4").toString() as "4" | "8" | "12";

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (prompt.length < 5) {
      return Response.json(
        { error: "Missing or too-short prompt" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const job = await client.videos.create({
      model: "sora-2",
      prompt,
      size,
      seconds,
    });

    return Response.json({
      id: job.id,
      status: job.status,
      progress: job.progress ?? 0,
    });
  } catch (error: any) {
    console.error("VIDEO POST ERROR:", error);

    return Response.json(
      {
        error: "Video job creation failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const job = await client.videos.retrieve(id);

    if (job.status !== "completed") {
      if (job.status === "failed") {
        return Response.json(
          {
            status: "failed",
            error: job.error?.message ?? "Video generation failed",
          },
          { status: 500 }
        );
      }

      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
      });
    }

    // ✅ deterministic path so repeated polls don't create new files
    const storagePath = `videos/${id}.mp4`;

    // ✅ if we've already saved this completed job, return existing URL immediately
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
      const text = await contentRes.text();

      return Response.json(
        {
          error: "Failed to download video content",
          details: text,
        },
        { status: 500 }
      );
    }

    const arrayBuffer = await contentRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, bytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      return Response.json(
        {
          error: "Supabase upload failed",
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);

    if (!publicUrl) {
      return Response.json(
        { error: "Failed to get public URL" },
        { status: 500 }
      );
    }

    const { error: dbError } = await supabaseAdmin.from("media").insert({
      type: "video",
      prompt: job.prompt ?? "",
      url: publicUrl,
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
      downloadUrl: publicUrl,
    });
  } catch (error: any) {
    console.error("VIDEO GET ERROR:", error);

    return Response.json(
      {
        error: "Status check failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}