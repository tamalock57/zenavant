import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const idea = (body?.idea ?? "").toString().trim();
    const type = (body?.type ?? "image-to-video").toString();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (idea.length < 5) {
      return Response.json(
        { error: "Idea is too short" },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
You are a cinematic prompt translator for a creative AI platform.

Your job is to convert messy user ideas into structured, high-quality prompts for IMAGE TO VIDEO generation.

Focus on:
- subtle, natural motion
- realistic human behavior
- cinematic camera direction
- emotional clarity through visible actions

Avoid:
- vague descriptions
- exaggerated acting
- unnatural motion
- any text appearing in the scene

Return ONLY valid JSON with this exact structure:

{
  "motion": "",
  "emotion": "",
  "camera": "",
  "style": "",
  "rules": [],
  "finalPrompt": ""
}
`;

    const userPrompt = `
User idea:
"${idea}"

Create a cinematic motion prompt for image-to-video.

IMPORTANT:
- The subject must remain consistent with the uploaded image
- Keep motion subtle and realistic
- No dialogue
- No text on screen
- No overacting

The finalPrompt must be clean, production-ready, and include rules.
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const text = response.output_text;

    return Response.json({ result: text });

  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}