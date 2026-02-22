import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { input } = await req.json();

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: input || "Say hello from Zenavant.",
    });

    return Response.json({ text: response.output_text });
  } catch (error: any) {
    console.error("FULL ERROR:", error);
    return Response.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}