import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { thought } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (!thought || typeof thought !== "string") {
      return Response.json({ error: "Missing thought" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are Zenavant: calm, practical, and encouraging.
Turn the user's thought into a clear plan.

Return JSON only with this shape:
{
  "title": string,
  "summary": string,
  "steps": string[],
  "firstTinyAction": string,
  "encouragement": string
}

Rules:
- steps: 3 to 6 items
- short, specific steps
- no hype, no emojis
- keep it gentle and grounded

User thought:
${thought}
`.trim();

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

    // response.output_text should be JSON (we asked for JSON only)
    const text = response.output_text?.trim() ?? "";

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "Model did not return valid JSON", raw: text },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error: any) {
    return Response.json(
      { error: "Turn-thought-into-plan failed", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}