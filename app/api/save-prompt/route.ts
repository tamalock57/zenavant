import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = (body?.title ?? "Untitled Prompt").toString().trim();
    const idea = (body?.idea ?? "").toString().trim();
    const prompt = (body?.prompt ?? "").toString().trim();
    const tool = (body?.tool ?? "turn-thought-into-prompt").toString().trim();
    const metadata = body?.metadata ?? {};

    if (!prompt) {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("media")
      .insert({
        type: "prompt",
        title,
        idea,
        prompt,
        tool,
        url: null,
        storage_path: null,
        metadata,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ item: data });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}