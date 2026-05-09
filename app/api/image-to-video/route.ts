import Replicate from "replicate";
import sharp from "sharp";
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

const I2V_MODELS: Record<string, {
  label: string;
  supportsReference: boolean;
  inputBuilder: (prompt: string, imageUrl: string, seconds: number, size: string) => object;
}> = {
  "kwaivgi/kling-v2.5-turbo-pro": {
    label: "Kling v2.5 Turbo",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl, seconds) => ({
      prompt,
      image: imageUrl,
      duration: seconds <= 5 ? 5 : 10,
      aspect_ratio: "16:9",
    }),
  },
  "kwaivgi/kling-v3-omni-video": {
    label: "Kling v3 Omni",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl, seconds) => ({
      prompt,
      image: imageUrl,
      duration: seconds <= 5 ? 5 : 10,
      aspect_ratio: "16:9",
    }),
  },
  "minimax/video-01": {
    label: "Minimax Video-01",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl) => ({
      prompt,
      first_frame_image: imageUrl,
    }),
  },
  "minimax/hailuo-02": {
    label: "Hailuo 2",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl) => ({
      prompt,
      first_frame_image: imageUrl,
    }),
  },
  "wan-video/wan-2.5-i2v": {
    label: "Wan 2.5 Image-to-Video",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl) => ({
      prompt,
      image: imageUrl,
    }),
  },
  "wan-video/wan-2.2-i2v-fast": {
    label: "Wan 2.2 Fast",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl) => ({
      prompt,
      image: imageUrl,
    }),
  },
  "bytedance/seedance-1-pro": {
    label: "Seedance 1 Pro",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl, seconds) => ({
      prompt,
      image: imageUrl,
      duration: seconds,
    }),
  },
  "bytedance/seedance-2.0": {
    label: "Seedance 2.0",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl, seconds) => ({
      prompt,
      image: imageUrl,
      duration: seconds,
    }),
  },
  "google/veo-2": {
    label: "Veo 2",
    supportsReference: false,
    inputBuilder: (prompt, _imageUrl, seconds) => ({
      prompt,
      duration: Math.min(seconds, 8),
      aspect_ratio: "16:9",
    }),
  },
  "lightricks/ltx-video": {
    label: "LTX Video",
    supportsReference: true,
    inputBuilder: (prompt, imageUrl, seconds) => ({
      prompt,
      image: imageUrl,
      num_frames: seconds * 8,
    }),
  },
};

async function uploadImageToSupabase(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Auto-resize to 1280x720 using sharp
  const resized = await sharp (buffer)
    .resize(1280, 720, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  const path = `inputs/${Date.now()}.jpg`;

  const { error } = await supabaseAdmin.storage
    .from("media")
    .upload(path, resized, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return supabaseAdmin.storage.from("media").getPublicUrl(path).data.publicUrl;
}


export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const prompt = (formData.get("prompt") ?? "").toString().trim();
    const modelId = (formData.get("modelId") ?? "bytedance/seedance-1-pro").toString();
    const seconds = Number(formData.get("seconds") ?? 5);
    const size = (formData.get("size") ?? "1280x720").toString();

    if (!image) return jsonError("Missing image file", 400);
    if (prompt.length < 5) return jsonError("Prompt is too short", 400);

    const modelConfig = I2V_MODELS[modelId];
    if (!modelConfig) return jsonError(`Unknown model: ${modelId}`, 400);

    // Upload main image to Supabase to get a public URL
    const imageUrl = await uploadImageToSupabase(image);

    const input = modelConfig.inputBuilder(prompt, imageUrl, seconds, size);

    const prediction = await replicate.predictions.create({
      model: modelId,
      input,
    });

    return Response.json({
      id: prediction.id,
      status: prediction.status,
      progress: 0,
      sourceImageUrl: imageUrl,
    });
  } catch (err: any) {
    console.error("IMAGE-TO-VIDEO POST ERROR:", err);
    return jsonError("Video job creation failed", 500, err?.message ?? String(err));
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const prompt = url.searchParams.get("prompt") ?? "";

    if (!id) return jsonError("Missing id", 400);

    const prediction = await replicate.predictions.get(id);

    if (prediction.status === "failed") {
      return Response.json(
        { status: "failed", progress: 0, error: prediction.error ?? "Generation failed" },
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
      return Response.json({
        status: "completed",
        progress: 100,
        downloadUrl: existingRow.url,
      });
    }

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return jsonError("Failed to download video", 500);

    const arrayBuffer = await videoRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("media")
      .upload(storagePath, bytes, { contentType: "video/mp4", upsert: true });

    if (uploadError) return jsonError("Supabase upload failed", 500, uploadError.message);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    await supabaseAdmin.from("media").upsert(
      {
        type: "video",
        prompt: prompt || (prediction.input as any)?.prompt || "",
        url: publicUrl,
        storage_path: storagePath,
        tool: "image-to-video",
      },
      { onConflict: "storage_path" }
    );

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl: publicUrl,
    });
  } catch (err: any) {
    console.error("IMAGE-TO-VIDEO GET ERROR:", err);
    return jsonError("Status check failed", 500, err?.message ?? String(err));
  }
}