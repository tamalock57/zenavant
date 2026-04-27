import { supabaseAdmin } from "@/lib/supabase/admin";
import Replicate from "replicate";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function jsonError(message: string, status = 400, details?: string) {
  return Response.json(
    details ? { error: message, details } : { error: message },
    { status }
  );
}

async function uploadAudioToSupabase(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const path = `audio/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error } = await supabaseAdmin.storage
    .from("media")
    .upload(path, bytes, {
      contentType: file.type || "audio/wav",
      upsert: false,
    });

  if (error) throw new Error(`Audio upload failed: ${error.message}`);

  return supabaseAdmin.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    const form = await req.formData();
    const videoUrl = String(form.get("videoUrl") ?? "").trim();
    const audioFile = form.get("audio") as File | null;
    const mode = String(form.get("mode") ?? "audio").trim();
    const text = String(form.get("text") ?? "").trim();

    if (!videoUrl) return jsonError("Missing videoUrl", 400);

    let prediction: any;

    if (mode === "text") {
      // Text-driven lip sync
      if (!text) return jsonError("Missing text for lip sync", 400);

      prediction = await replicate.predictions.create({
        model: "kwaivgi/kling-lip-sync",
        input: {
          video: videoUrl,
          mode: "text",
          text,
        },
      });
    } else {
      // Audio-driven lip sync
      if (!audioFile) return jsonError("Missing audio file", 400);

      const audioUrl = await uploadAudioToSupabase(audioFile);

      prediction = await replicate.predictions.create({
        model: "kwaivgi/kling-lip-sync",
        input: {
          video: videoUrl,
          mode: "audio",
          audio: audioUrl,
        },
      });
    }

    return Response.json({
      id: prediction.id,
      status: prediction.status ?? "starting",
    });
  } catch (e: any) {
    console.error("LIPSYNC POST ERROR:", e);
    return jsonError("Lip sync failed", 500, e?.message ?? String(e));
  }
}

export async function GET(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return jsonError("Missing REPLICATE_API_TOKEN", 500);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("Missing id", 400);

    const prediction = await replicate.predictions.get(id);

    if (prediction.status === "failed") {
      return Response.json({
        status: "failed",
        error: prediction.error ?? "Lip sync failed",
      });
    }

    if (prediction.status !== "succeeded") {
      return Response.json({
        status: prediction.status === "processing" ? "processing" : "starting",
      });
    }

    const output = prediction.output;
    const downloadUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output)
        ? output[0]
        : null;

    if (!downloadUrl) return jsonError("No output URL", 500);

    // Save to Supabase
    const storagePath = `videos/lipsync-${id}.mp4`;

    const { data: existingRow } = await supabaseAdmin
      .from("media")
      .select("id, url")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingRow?.url) {
      return Response.json({
        status: "completed",
        downloadUrl: existingRow.url,
      });
    }

    const videoRes = await fetch(downloadUrl);
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

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    await supabaseAdmin.from("media").upsert(
      {
        type: "video",
        prompt: "",
        url: publicUrl,
        storage_path: storagePath,
        tool: "lip-sync",
      },
      { onConflict: "storage_path" }
    );

    return Response.json({
      status: "completed",
      downloadUrl: publicUrl,
    });
  } catch (e: any) {
    console.error("LIPSYNC GET ERROR:", e);
    return jsonError("Status check failed", 500, e?.message ?? String(e));
  }
}