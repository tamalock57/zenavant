import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { thought } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    if (!thought || typeof thought !== "string") {
      return Response.json({ error: "Missing thought" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are Zenavant: calm, warm, practical, and encouraging. Keep things grounded and specific. No hype. No emojis. Make the plan feel doable and kind.",
        },
        {
          role: "user",
          content: thought,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "turn_thought_into_plan",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              steps: {
                type: "array",
                minItems: 3,
                maxItems: 6,
                items: { type: "string", maxLength: 160, description: "One short plain-English step. No codes, no timestamps, no random numbers." },
              },
              firstTinyAction: { type: "string" },
              encouragement: { type: "string" },
            },
            required: ["title", "summary", "steps", "firstTinyAction", "encouragement"],
          },
        },
      },
    });

    const jsonText = response.output_text?.trim() ?? "";
    const data = JSON.parse(jsonText);

   const rawSteps = Array.isArray(data.steps)
  ? data.steps
  : String(data.steps ?? "").split("\n");

   const cleanSteps = rawSteps
  .map((s: any) => String(s ?? "").trim())
  .filter(Boolean)
  .filter((s: string) => (s.match(/\d/g) || []).length < 20)
  .slice(0, 6);
    [];

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("plans")
      .insert({
        thought,
        title: data.title,
        summary: data.summary,
        steps: cleanSteps,
        first_tiny_action: data.firstTinyAction,
        encouragement: data.encouragement,
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Supabase insert error:", saveError);
      return Response.json(
        { error: "Failed to save plan", details: saveError.message },
        { status: 500 }
      );
    }

    return Response.json({
  id: saved.id,
  title: data.title,
  summary: data.summary,
  steps: cleanSteps,
  firstTinyAction: data.firstTinyAction,
  encouragement: data.encouragement,
});
  } catch (error: any) {
    return Response.json(
      { error: "Turn-thought-into-plan failed", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}