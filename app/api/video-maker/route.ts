import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function jsonError(message: string, status = 400, details?: string) {
  return Response.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

function toBytes(buf: ArrayBuffer) {
  return new Uint8Array(buf);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = (body?.prompt ?? "").toString().trim();
    const size = (body?.size ?? "1280x720").toString() as
      | "1280x720"
      | "720x1280"
      | "1792x1024"
      | "1024x1792";
    const seconds = (body?.seconds ?? "4").toString() as "4" | "8" | "12";
    const numOutputs = Math.min(
      3,
      Math.max(1, Number(body?.numOutputs ?? 1))
    );

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY", 500);
    }

    if (prompt.length < 5) {
      return jsonError("Missing or too-short prompt", 400);
    }

    if (!["4", "8", "12"].includes(seconds)) {
      return jsonError("Seconds must be 4, 8, or 12", 400);
    }

    if (
      !["1280x720", "720x1280", "1792x1024", "1024x1792"].includes(size)
    ) {
      return jsonError(
        "Size must be 1280x720, 720x1280, 1792x1024, or 1024x1792",
        400
      );
    }

    const jobs = await Promise.all(
      Array.from({ length: numOutputs }).map(() =>
        client.videos.create({
          model: "sora-2",
          prompt,
          size,
          seconds,
        })
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
  } catch (error: any) {
    console.error("VIDEO POST ERROR:", error);
    return jsonError(
      "Video job creation failed",
      500,
      error?.message ?? String(error)
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return jsonError("Missing id", 400);
    }

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY", 500);
    }

    const job = await client.videos.retrieve(id);

    if (job.status === "failed") {
      return Response.json(
        {
          status: "failed",
          progress: job.progress ?? 0,
          error: job.error?.message ?? "Video generation failed",
        },
        { status: 500 }
      );
    }

    if (job.status !== "completed") {
      return Response.json({
        status: job.status,
        progress: job.progress ?? 0,
      });
    }

    const storagePath = `videos/${id}.mp4`;

    const { data: existingRow, error: existingError } = await supabaseAdmin
      .from("media")
      .select("id, url, storage_path")
      .eq("type", "video")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingError) {
      return jsonError(
        "Failed to check existing video",
        500,
        existingError.message
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
        cache: "no-store",
      }
    );

    if (!contentRes.ok) {
      const text = await contentRes.text().catch(() => "");
      return jsonError("Failed to download video content", 500, text);
    }

    const arrayBuffer = await contentRes.arrayBuffer();
    const bytes = toBytes(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, bytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      return jsonError("Supabase upload failed", 500, uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);

    if (!publicUrl) {
      return jsonError("Failed to get public URL", 500);
    }

    const { error: upsertError } = await supabaseAdmin
      .from("media")
      .upsert(
        {
          type: "video",
          prompt: job.prompt ?? "",
          url: publicUrl,
          storage_path: storagePath,
        },
        {
          onConflict: "storage_path",
        }
      );

    if (upsertError) {
      return jsonError("DB upsert failed", 500, upsertError.message);
    }

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl: publicUrl,
    });
  } catch (error: any) {
    console.error("VIDEO GET ERROR:", error);
    return jsonError(
      "Status check failed",
      500,
      error?.message ?? String(error)
    );
  }
}