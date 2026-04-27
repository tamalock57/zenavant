import OpenAI, { toFile } from "openai";
import Replicate from "replicate";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function decodeBase64Image(b64: string) {
  return Buffer.from(b64, "base64");
}

function makeFileName(ext = "png") {
  return `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

async function uploadAndSave(prompt: string, buffer: Buffer, ext = "png") {
  const fileName = makeFileName(ext);
  const contentType = ext === "jpg" ? "image/jpeg" : "image/png";

  const { error: uploadError } = await supabaseAdmin.storage
    .from("media")
    .upload(fileName, buffer, { contentType, upsert: false });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(fileName);

  const { error: dbError } = await supabaseAdmin.from("media").insert({
    type: "image",
    prompt,
    url: publicUrl,
    storage_path: fileName,
  });

  if (dbError) throw new Error(`DB insert failed: ${dbError.message}`);

  return publicUrl;
}

async function generateWithOpenAI(
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536",
  numOutputs: number,
  referenceFiles: File[]
) {
  const urls: string[] = [];

  if (referenceFiles.length > 0) {
    const openaiFiles = await Promise.all(
      referenceFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return toFile(Buffer.from(arrayBuffer), file.name || "reference.png", {
          type: file.type || "image/png",
        });
      })
    );

    for (let i = 0; i < numOutputs; i++) {
      const edited = await openai.images.edit({
        model: "gpt-image-1",
        image: openaiFiles,
        prompt,
        size,
      });

      const b64 = edited.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned from OpenAI");

      const url = await uploadAndSave(prompt, decodeBase64Image(b64));
      urls.push(url);
    }
  } else {
    for (let i = 0; i < numOutputs; i++) {
      const generated = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
      });

      const b64 = generated.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned from OpenAI");

      const url = await uploadAndSave(prompt, decodeBase64Image(b64));
      urls.push(url);
    }
  }

  return urls;
}

async function generateWithReplicate(
  prompt: string,
  modelId: string,
  size: string,
  numOutputs: number
) {
  const [width, height] = size.split("x").map(Number);
  const urls: string[] = [];

  const MODEL_INPUTS: Record<string, object> = {
    "black-forest-labs/flux-pro": { prompt, width, height, steps: 25 },
    "black-forest-labs/flux-schnell": { prompt, width, height, num_inference_steps: 4 },
    "bytedance/seedream-4.5": { prompt, width, height },
    "bytedance/seedream-4": { prompt, width, height },
    "tencent/hunyuan-image-2.1": { prompt, width, height },
    "prunaai/wan-2.2-image": { prompt, width, height },
  };

  const input = MODEL_INPUTS[modelId] ?? { prompt, width, height };

  for (let i = 0; i < numOutputs; i++) {
    const prediction = await replicate.predictions.create({
      model: modelId,
      input,
    });

    // Poll until done
    let result = prediction;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise((r) => setTimeout(r, 2000));
      result = await replicate.predictions.get(result.id);
    }

    if (result.status === "failed") {
      throw new Error(result.error ?? "Replicate generation failed");
    }

    const imageUrl = Array.isArray(result.output)
      ? result.output[0]
      : result.output;

    if (!imageUrl) throw new Error("No image URL returned");

    // Download and save to Supabase
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error("Failed to download image from Replicate");

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadAndSave(prompt, buffer, "jpg");
    urls.push(url);
  }

  return urls;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "").trim();
    const size = String(form.get("size") ?? "1024x1024").trim();
    const modelId = String(form.get("modelId") ?? "gpt-image-1").trim();
    const numOutputs = Math.min(3, Math.max(1, Number(form.get("numOutputs") ?? 1)));
    const referenceImages = form.getAll("referenceImages") as File[];

    if (!prompt) return jsonError("Missing prompt");

    let urls: string[] = [];

    if (modelId === "gpt-image-1") {
      if (!process.env.OPENAI_API_KEY) {
        return jsonError("Missing OPENAI_API_KEY", 500);
      }
      const validSizes = ["1024x1024", "1536x1024", "1024x1536"];
      if (!validSizes.includes(size)) return jsonError("Invalid size for GPT Image");

      urls = await generateWithOpenAI(
        prompt,
        size as "1024x1024" | "1536x1024" | "1024x1536",
        numOutputs,
        referenceImages
      );
    } else {
      if (!process.env.REPLICATE_API_TOKEN) {
        return jsonError("Missing REPLICATE_API_TOKEN", 500);
      }
      urls = await generateWithReplicate(prompt, modelId, size, numOutputs);
    }

    if (urls.length === 1) return Response.json({ url: urls[0] });
    return Response.json({ urls });
  } catch (err: any) {
    console.error("POST /api/image-maker error:", err);
    return Response.json(
      { error: err?.message ?? "Image generation failed" },
      { status: 500 }
    );
  }
}