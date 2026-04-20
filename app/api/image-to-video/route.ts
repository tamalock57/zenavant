import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function fileToBase64(file: File) {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString("base64");
}

async function generatePromptIfNeeded(client: OpenAI, idea: string, intensity: string) {
  const system = `
You are Zenavant's image-to-video prompt translator.
Return ONLY valid JSON:
{
  "title": "",
  "finalPrompt": ""
}
`;

  const user = `
User idea:
"${idea}"

This is for animating an uploaded image.

Intensity:
${intensity}

Rules:
- Keep movement realistic
- Keep motion subtle unless the user clearly wants more drama
- Include "The subject remains consistent with the uploaded image."
- No text, captions, logos, subtitles, or watermarks
`;

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const text = response.output_text?.trim() || "";
  const parsed = JSON.parse(text);
  return parsed as { title: string; finalPrompt: string };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const promptInput = (formData.get("prompt") ?? "").toString().trim();
    const idea = (formData.get("idea") ?? "").toString().trim();
    const intensity = (formData.get("intensity") ?? "balanced").toString();
    const size = (formData.get("size") ?? "1280x720").toString();
    const seconds = (formData.get("seconds") ?? "4").toString() as "4" | "8" | "12";
    const fit = (formData.get("fit") ?? "preserve").toString();

    if (!image) {
      return Response.json({ error: "Missing image file" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let finalPrompt = promptInput;
    let generatedTitle = "Image to Video Prompt";

    if (!finalPrompt) {
      if (!idea || idea.length < 5) {
        return Response.json(
          { error: "Either prompt or idea is required." },
          { status: 400 }
        );
      }

      const generated = await generatePromptIfNeeded(client, idea, intensity);
      finalPrompt = generated.finalPrompt;
      generatedTitle = generated.title || generatedTitle;
    }

    const imageBytes = await image.arrayBuffer();
    const imageBuffer = Buffer.from(imageBytes);

    const imagePath = `inputs/${Date.now()}-${image.name.replace(/\s+/g, "-")}`;
    const uploadImageResult = await supabaseAdmin.storage
      .from("media")
      .upload(imagePath, imageBuffer, {
        contentType: image.type || "image/png",
        upsert: false,
      });

    if (uploadImageResult.error) {
      return Response.json({ error: uploadImageResult.error.message }, { status: 500 });
    }

    const imagePublicUrl = supabaseAdmin.storage.from("media").getPublicUrl(imagePath).data.publicUrl;

    // Replace this block only if your video API signature differs.
    const job = await client.videos.create({
      model: "sora-2",
      prompt: finalPrompt,
      size,
      seconds,
      image_url: imagePublicUrl,
    } as any);

    const jobId = (job as any)?.id;
    if (!jobId) {
      return Response.json({ error: "Video job did not return an id" }, { status: 500 });
    }

    let status = (job as any)?.status || "queued";
    let attempts = 0;
    let latestJob: any = job;

    while (status !== "completed" && status !== "failed" && attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      latestJob = await client.videos.retrieve(jobId as any);
      status = latestJob?.status;
      attempts++;
    }

    if (status !== "completed") {
      return Response.json(
        { error: latestJob?.error?.message || "Video generation failed or timed out." },
        { status: 500 }
      );
    }

    const videoBinaryResponse = await fetch(
      `https://api.openai.com/v1/videos/${jobId}/content`,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (!videoBinaryResponse.ok) {
      const text = await videoBinaryResponse.text();
      return Response.json({ error: `Failed to fetch video binary: ${text}` }, { status: 500 });
    }

    const videoArrayBuffer = await videoBinaryResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);

    const videoPath = `videos/${Date.now()}-${jobId}.mp4`;
    const uploadVideoResult = await supabaseAdmin.storage
      .from("media")
      .upload(videoPath, videoBuffer, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadVideoResult.error) {
      return Response.json({ error: uploadVideoResult.error.message }, { status: 500 });
    }

    const videoPublicUrl = supabaseAdmin.storage.from("media").getPublicUrl(videoPath).data.publicUrl;

    const { data: savedVideo, error: savedVideoError } = await supabaseAdmin
      .from("media")
      .insert({
        type: "video",
        title: generatedTitle,
        idea: idea || null,
        prompt: finalPrompt,
        tool: "image-to-video",
        url: videoPublicUrl,
        storage_path: videoPath,
        metadata: {
          size,
          seconds,
          fit,
          sourceImageUrl: imagePublicUrl,
        },
      })
      .select()
      .single();

    if (savedVideoError) {
      return Response.json({ error: savedVideoError.message }, { status: 500 });
    }

    await supabaseAdmin.from("media").insert({
      type: "prompt",
      title: generatedTitle,
      idea: idea || null,
      prompt: finalPrompt,
      tool: "image-to-video",
      url: null,
      storage_path: null,
      metadata: {
        linkedVideoId: savedVideo?.id || null,
        size,
        seconds,
        fit,
      },
    });

    return Response.json({
      url: videoPublicUrl,
      prompt: finalPrompt,
      item: savedVideo,
      sourceImageUrl: imagePublicUrl,
    });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}