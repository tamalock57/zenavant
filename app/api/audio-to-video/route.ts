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

async function uploadFileToSupabase(
  file: File,
  folder: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error } = await supabaseAdmin.storage
    .from("media")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return supabaseAdmin.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    const formData = await req.formData();

    const mode = (formData.get("mode") ?? "native-audio").toString();
    const prompt = (formData.get("prompt") ?? "").toString().trim();
    const seconds = Number(formData.get("seconds") ?? 5);
    const audioFile = formData.get("audio") as File | null;
    const imageFile = formData.get("image") as File | null;

    if (!prompt) return jsonError("Prompt is required", 400);

    let prediction: any;

    if (mode === "native-audio") {
      // Mode 1: Generate video with native audio using Seedance 2.0
      prediction = await replicate.predictions.create({
        model: "bytedance/seedance-2.0",
        input: {
          prompt,
          duration: seconds,
        },
      });
    } else if (mode === "audio-to-video") {
      // Mode 2: Generate video from audio file + prompt
      if (!audioFile) return jsonError("Audio file is required", 400);

      const audioUrl = await uploadFileToSupabase(audioFile, "audio");

      prediction = await replicate.predictions.create({
        model: "wan-video/wan-2.2-s2v",
        input: {
          prompt,
          audio: audioUrl,
        },
      });
    } else if (mode === "audio-image-to-video") {
      // Mode 3: Animate image with audio
      if (!audioFile) return jsonError("Audio file is required", 400);
      if (!imageFile) return jsonError("Image file is required", 400);

      const audioUrl = await uploadFileToSupabase(audioFile, "audio");
      const imageUrl = await uploadFileToSupabase(imageFile, "inputs");

      prediction = await replicate.predictions.create({
        model: "wan-video/wan-2.2-s2v",
        input: {
          prompt,
          audio: audioUrl,
          image: imageUrl,
        },
      });
    } else {
      return jsonError("Invalid mode", 400);
    }

    return Response.json({
      id: prediction.id,
      status: prediction.status,
      progress: 0,
    });
  } catch (err: any) {
    console.error("AUDIO-TO-VIDEO POST ERROR:", err);
    return jsonError(
      "Video generation failed",
      500,
      err?.message ?? String(err)
    );
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
        {
          status: "failed",
          progress: 0,
          error: prediction.error ?? "Generation failed",
        },
        { status: 500 }
      );
    }

    if (prediction.status !== "succeeded") {
      return Response.json({
        status:
          prediction.status === "processing" ? "in_progress" : "queued",
        progress: 0,
      });
    }

    const videoUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!videoUrl) return jsonError("No video URL in response", 500);

    const storagePath = `videos/audio-to-video-${id}.mp4`;

    // Check if already saved
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

    // Download and save
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return jsonError("Failed to download video", 500);

    const arrayBuffer = await videoRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

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

    await supabaseAdmin.from("media").upsert(
      {
        type: "video",
        prompt: prompt || (prediction.input as any)?.prompt || "",
        url: publicUrl,
        storage_path: storagePath,
        tool: "audio-to-video",
      },
      { onConflict: "storage_path" }
    );

    return Response.json({
      status: "completed",
      progress: 100,
      downloadUrl: publicUrl,
    });
  } catch (err: any) {
    console.error("AUDIO-TO-VIDEO GET ERROR:", err);
    return jsonError(
      "Status check failed",
      500,
      err?.message ?? String(err)
    );
  }
}