import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are Zenavant: calm, warm, practical, and encouraging. Keep things grounded and specific. No hype. No emojis. Make the plan feel doable and kind.

Return ONLY valid JSON with this exact structure, nothing else:
{
  "title": "",
  "summary": "",
  "steps": ["step 1", "step 2", "step 3"],
  "firstTinyAction": "",
  "encouragement": ""
}

Rules:
- steps must be 3 to 6 plain English steps
- Each step max 160 characters
- No timestamps, codes, or random numbers
- No markdown, no extra text outside the JSON`,
        },
        {
          role: "user",
          content: thought,
        },
      ],
    });

    const jsonText = response.choices[0]?.message?.content?.trim() ?? "";

    let data: any;
    try {
      const clean = jsonText.replace(/```json|```/g, "").trim();
      data = JSON.parse(clean);
    } catch {
      return Response.json(
        { error: "Failed to parse plan response", details: jsonText },
        { status: 500 }
      );
    }

    const rawSteps = Array.isArray(data.steps)
      ? data.steps
      : String(data.steps ?? "").split("\n");

    const cleanSteps = rawSteps
      .map((s: any) => String(s ?? "").trim())
      .filter(Boolean)
      .filter((s: string) => (s.match(/\d/g) || []).length < 20)
      .slice(0, 6);

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
    console.error("Turn-thought-into-plan error:", error);
    return Response.json(
      {
        error: "Turn-thought-into-plan failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}