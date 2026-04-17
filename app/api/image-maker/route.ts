import OpenAI, { toFile } from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function decodeBase64Image(b64: string) {
  return Buffer.from(b64, "base64");
}

function makeFileName() {
  return `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
}

async function uploadImageAndSaveRow(prompt: string, buffer: Buffer) {
  const fileName = makeFileName();

  const upload = await supabaseAdmin.storage.from("media").upload(fileName, buffer, {
    contentType: "image/png",
    upsert: false,
  });

  if (upload.error) {
    throw new Error(`Supabase upload failed: ${upload.error.message}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("media")
    .getPublicUrl(fileName);

  const url = publicUrlData.publicUrl;

  const { error: dbError } = await supabaseAdmin.from("media").insert({
    type: "image",
    prompt,
    url,
    storage_path: fileName,
  });

  if (dbError) {
    throw new Error(`DB insert failed: ${dbError.message}`);
  }

  return url;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "").trim();
    const size = String(form.get("size") ?? "1024x1024").trim() as
      | "1024x1024"
      | "1536x1024"
      | "1024x1536";

    const numOutputs = Math.min(
      3,
      Math.max(1, Number(form.get("numOutputs") ?? 1))
    );

    const mainImage = form.get("mainImage") as File | null;
    const referenceImages = form.getAll("referenceImages") as File[];

    const allReferenceFiles = [
      ...(mainImage ? [mainImage] : []),
      ...referenceImages.filter(Boolean),
    ];

    if (!process.env.OPENAI_API_KEY) {
      return jsonError("Missing OPENAI_API_KEY on server", 500);
    }

    if (!prompt) {
      return jsonError("Missing prompt");
    }

    if (!["1024x1024", "1536x1024", "1024x1536"].includes(size)) {
      return jsonError("Invalid size");
    }

    for (const file of allReferenceFiles) {
      if (!file.type.startsWith("image/")) {
        return jsonError("All references must be image files");
      }
    }

    const urls: string[] = [];

    if (allReferenceFiles.length > 0) {
      const openaiFiles = await Promise.all(
        allReferenceFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return toFile(Buffer.from(arrayBuffer), file.name || "reference.png", {
            type: file.type || "image/png",
          });
        })
      );

      for (let i = 0; i < numOutputs; i++) {
  const variedPrompt =
    prompt + ` slight variation in expression and framing, variation ${i + 1}`;

  const edited = await openai.images.edit({
    model: "gpt-image-1.5",
    image: openaiFiles,
    prompt: variedPrompt,
    size,
    input_fidelity: "high",
  });

  const resultB64 = edited.data?.[0]?.b64_json ?? null;

  if (!resultB64) {
    return jsonError("No image returned from OpenAI", 500);
  }

  const buffer = decodeBase64Image(resultB64);
  const url = await uploadImageAndSaveRow(prompt, buffer);
  urls.push(url);
}

    } else {
      for (let i = 0; i < numOutputs; i++) {
  const variedPrompt =
    prompt + ` slight variation in expression and framing, variation ${i + 1}`;

  const generated = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt: variedPrompt,
    size,
  });

  const resultB64 = generated.data?.[0]?.b64_json ?? null;

  if (!resultB64) {
    return jsonError("No image returned from OpenAI", 500);
  }

  const buffer = decodeBase64Image(resultB64);
  const url = await uploadImageAndSaveRow(prompt, buffer);
  urls.push(url);
}

    }

    if (urls.length === 1) {
      return Response.json({ url: urls[0] });
    }

    return Response.json({ urls });
  } catch (err: any) {
    console.error("POST /api/image-maker error:", err);
    return Response.json(
      { error: err?.message ?? "Image generation failed" },
      { status: 500 }
    );
  }
}
