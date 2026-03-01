import OpenAI from "openai";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const st = await client.videos.retrieve(id);

    // Return the full status object so we can see what fields exist
    return Response.json({ ok: true, status: (st as any).status, data: st });
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: "Status check failed",
        message: err?.message ?? String(err),
        details: err?.response?.data ?? err?.error ?? null,
      },
      { status: 500 }
    );
  }
}

