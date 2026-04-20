import OpenAI from "openai";

export const runtime = "nodejs";

type PromptMode = "image" | "image-to-video" | "video";

function buildSystemPrompt() {
  return `
You are Zenavant's prompt translator.

Your job is to turn rough user ideas into structured, production-ready prompts.

You must:
- preserve the user's intent
- translate emotions into visible actions
- make prompts cinematic, clear, and realistic
- keep motion subtle unless the user clearly wants dramatic action
- avoid vague filler language

Return ONLY valid JSON with this exact structure:

{
  "title": "",
  "summary": "",
  "subject": "",
  "setting": "",
  "action": "",
  "emotion": "",
  "camera": "",
  "style": "",
  "rules": [],
  "finalPrompt": ""
}
`;
}

function buildUserPrompt({
  idea,
  mode,
  intensity,
  styleHint,
}: {
  idea: string;
  mode: PromptMode;
  intensity: "subtle" | "balanced" | "dramatic";
  styleHint?: string;
}) {
  const motionNote =
    mode === "image-to-video" || mode === "video"
      ? "This is for motion generation. Include subtle, realistic movement unless the chosen intensity says otherwise."
      : "This is for still image generation. Do not describe motion as the main event unless needed for pose or expression.";

  const intensityNote =
    intensity === "subtle"
      ? "Keep emotion and action restrained, natural, and minimal."
      : intensity === "dramatic"
      ? "Push the scene slightly more cinematically and emotionally, but stay believable."
      : "Balance realism and cinematic clarity.";

  return `
User idea:
"${idea}"

Mode:
${mode}

Intensity:
${intensity}

Optional style hint:
${styleHint || "none"}

Instructions:
- ${motionNote}
- ${intensityNote}
- Translate feelings into visible details.
- Use camera language only if it improves the result.
- Include a clean rules array.
- No on-screen text, letters, subtitles, captions, logos, or watermarks unless explicitly requested.
- Keep results realistic and production-ready.

If mode is "image-to-video" or "video", the finalPrompt should include:
"The subject remains consistent with the uploaded image."
ONLY when the output is intended to animate an uploaded image.
`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json();
    const idea = (body?.idea ?? "").toString().trim();
    const mode = (body?.mode ?? "image") as PromptMode;
    const intensity = (body?.intensity ?? "balanced") as "subtle" | "balanced" | "dramatic";
    const styleHint = (body?.styleHint ?? "").toString().trim();

    if (idea.length < 5) {
      return Response.json({ error: "Idea is too short" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      input: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({
            idea,
            mode,
            intensity,
            styleHint,
          }),
        },
      ],
    });

    const text = response.output_text?.trim();

    if (!text) {
      return Response.json({ error: "No prompt output returned" }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Failed to parse model response as JSON", raw: text },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}