import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { prompt, size } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return Response.json({ error: "Missing or too-short prompt" }, { status: 400 });
    }

    // Allowed sizes (keep it simple + safe)
    const allowedSizes = new Set(["1024x1024", "1024x1536", "1536x1024"]);
    const finalSize = allowedSizes.has(size) ? size : "1024x1024";

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Returns base64 so you can render immediately without hosting
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt: prompt.trim(),
      size: finalSize,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json({ error: "No image returned" }, { status: 500 });
    }

    // Data URL for instant display in <img src="...">
    const dataUrl = `data:image/png;base64,${b64}`;

    return Response.json({ image: dataUrl });
  } catch (error: any) {
    return Response.json(
      { error: "Image generation failed", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}