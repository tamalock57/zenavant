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

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const prompt = String(form.get("prompt") ?? "").trim();
    const size = String(form.get("size") ?? "1024x1024").trim();

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

    for (const file of allReferenceFiles) {
      if (!file.type.startsWith("image/")) {
        return jsonError("All references must be image files");
      }
    }

    let resultB64: string | null = null;

    if (allReferenceFiles.length > 0) {
      const openaiFiles = await Promise.all(
        allReferenceFiles.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return toFile(Buffer.from(arrayBuffer), file.name || "reference.png", {
            type: file.type || "image/png",
          });
        })
      );

      const edited = await openai.images.edit({
        model: "gpt-image-1.5",
        image: openaiFiles,
        prompt,
        size: size as "1024x1024" | "1536x1024" | "1024x1536",
        input_fidelity: "high",
      });

      resultB64 = edited.data?.[0]?.b64_json ?? null;
    } else {
      const generated = await openai.images.generate({
        model: "gpt-image-1.5",
        prompt,
        size: size as "1024x1024" | "1536x1024" | "1024x1536",
      });

      resultB64 = generated.data?.[0]?.b64_json ?? null;
    }

    if (!resultB64) {
      return jsonError("No image returned from OpenAI", 500);
    }

    const buffer = decodeBase64Image(resultB64);
    const fileName = `images/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`;

    const upload = await supabaseAdmin.storage.from("media").upload(fileName, buffer, {
      contentType: "image/png",
      upsert: false,
    });

    if (upload.error) {
      return jsonError(`Supabase upload failed: ${upload.error.message}`, 500);
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
      return jsonError(`DB insert failed: ${dbError.message}`, 500);
    }

    return Response.json({ url });
  } catch (err: any) {
    console.error("POST /api/image-maker error:", err);
    return Response.json(
      { error: err?.message ?? "Image generation failed" },
      { status: 500 }
    );
  }
}