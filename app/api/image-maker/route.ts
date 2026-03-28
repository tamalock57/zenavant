import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function base64ToUint8Array(base64: string) {
  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer);
}

export async function POST(req: Request) {
  try {
    const { prompt, size } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return Response.json({ error: "Missing or too-short prompt" }, { status: 400 });
    }

    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const finalSize = allowedSizes.has(size) ? size : "1024x1024";

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: prompt.trim(),
      size: finalSize as "1024x1024" | "1024x1536" | "1536x1024",
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json({ error: "No image returned" }, { status: 500 });
    }

    const bytes = base64ToUint8Array(b64);

    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    const storagePath = `images/${filename}`;

    const upload = await supabaseAdmin.storage.from("media").upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: false,
    });

    if (upload.error) {
      return Response.json(
        {
          error: "Supabase upload failed",
          details: upload.error.message,
        },
        { status: 500 }
      );
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("media")
      .getPublicUrl(storagePath);

    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      return Response.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    const { error: dbError } = await supabaseAdmin.from("media").insert({
      type: "image",
      prompt: prompt.trim(),
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
      imageUrl: publicUrl,
    });
  } catch (error: any) {
    console.error("IMAGE MAKER ERROR:", error);

    return Response.json(
      {
        error: "Image generation failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}