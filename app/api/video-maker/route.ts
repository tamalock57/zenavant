import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function jsonError(message: string, status = 400, details?: string) {
  return Response.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

// Model configurations
const VIDEO_MODELS: Record<string, { label: string; inputBuilder: (prompt: string, seconds: number, size: string) => object }> = {
  "kwaivgi/kling-v3-video": {
    label: "Kling v3",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: seconds <= 5 ? 5 : 10,
      aspect_ratio: "16:9",
    }),
  },
  "kwaivgi/kling-v2.5-turbo-pro": {
    label: "Kling v2.5 Turbo",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: seconds <= 5 ? 5 : 10,
      aspect_ratio: "16:9",
    }),
  },
  "minimax/video-01": {
    label: "Minimax Video-01",
    inputBuilder: (prompt) => ({
      prompt,
    }),
  },
  "minimax/hailuo-02": {
    label: "Hailuo 2",
    inputBuilder: (prompt) => ({
      prompt,
    }),
  },
  "wan-video/wan-2.5-t2v": {
    label: "Wan 2.5",
    inputBuilder: (prompt) => ({
      prompt,
    }),
  },
  "wan-video/wan-2.2-t2v-fast": {
    label: "Wan 2.2 Fast",
    inputBuilder: (prompt) => ({
      prompt,
    }),
  },
  "lightricks/ltx-video": {
    label: "LTX Video",
    inputBuilder: (prompt, seconds, size) => ({
      prompt,
      num_frames: seconds * 8,
      width: parseInt(size.split("x")[0]) || 768,
      height: parseInt(size.split("x")[1]) || 512,
    }),
  },
  "google/veo-2": {
    label: "Veo 2",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: Math.min(seconds, 8),
      aspect_ratio: "16:9",
    }),
  },
  "google/veo-3.1-lite": {
    label: "Veo 3.1 Lite",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: Math.min(seconds, 8),
      aspect_ratio: "16:9",
    }),
  },
  "tencent/hunyuan-video": {
    label: "Hunyuan Video",
    inputBuilder: (prompt) => ({
      prompt,
    }),
  },
  "bytedance/seedance-2.0": {
    label: "Seedance 2.0",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: seconds,
    }),
  },
  "bytedance/seedance-1-pro": {
    label: "Seedance 1 Pro",
    inputBuilder: (prompt, seconds) => ({
      prompt,
      duration: seconds,
    }),
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const prompt = (body?.prompt ?? "").toString().trim();
    const size = (body?.size ?? "1280x720").toString();
    const seconds = Number(body?.seconds ?? 5);
    const numOutputs = Math.min(3, Math.max(1, Number(body?.numOutputs ?? 1)));
    const modelId = (body?.modelId ?? "bytedance/seedance-1-pro").toString();

    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    if (prompt.length < 5) {
      return jsonError("Missing or too-short prompt", 400);
    }

    const modelConfig = VIDEO_MODELS[modelId];
    if (!modelConfig) {
      return jsonError(`Unknown model: ${modelId}`, 400);
    }

    const input = modelConfig.inputBuilder(prompt, seconds, size);

    const jobs = await Promise.all(
      Array.from({ length: numOutputs }).map(() =>
        replicate.predictions.create({
          model: modelId,
          input,
        })
      )
    );

    const ids = jobs.map((job) => job.id);
    const first = jobs[0];

    if (ids.length === 1) {
      return Response.json({ id: first.id, status: first.status, progress: 0 });
    }

    return Response.json({ ids, status: first.status, progress: 0 });
  } catch (error: any) {
    console.error("VIDEO POST ERROR:", error);
    return jsonError("Video job creation failed", 500, error?.message ?? String(error));
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonError("Missing id", 400);

    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    const prediction = await replicate.predictions.get(id);

    if (prediction.status === "failed") {
      return Response.json(
        { status: "failed", progress: 0, error: prediction.error ?? "Video generation failed" },
        { status: 500 }
      );
    }

    if (prediction.status !== "succeeded") {
      return Response.json({
        status: prediction.status === "processing" ? "in_progress" : "queued",
        progress: 0,
      });
    }

    const videoUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!videoUrl) return jsonError("No video URL in response", 500);

    const storagePath = `videos/${id}.mp4`;

    const { data: existingRow } = await supabaseAdmin
      .from("media")
      .select("id, url")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingRow?.url) {
      return Response.json({ status: "completed", progress: 100, downloadUrl: existingRow.url });
    }

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return jsonError("Failed to download video", 500);

    const arrayBuffer = await videoRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Preserve original content type from Replicate
    const contentType = videoRes.headers.get("content-type") || "video/mp4";

    const { error: uploadError } = await supabaseAdmin.storage
    .from("media")
    .upload(storagePath, bytes, { contentType, upsert: true });

    if (uploadError) return jsonError("Supabase upload failed", 500, uploadError.message);

    const { data: { publicUrl } } = supabaseAdmin.storage.from("media").getPublicUrl(storagePath);

    await supabaseAdmin.from("media").upsert(
      { type: "video", prompt: (prediction.input as any)?.prompt ?? "", url: publicUrl, storage_path: storagePath },
      { onConflict: "storage_path" }
    );

    return Response.json({ status: "completed", progress: 100, downloadUrl: publicUrl });
  } catch (error: any) {
    console.error("VIDEO GET ERROR:", error);
    return jsonError("Status check failed", 500, error?.message ?? String(error));
  }
}