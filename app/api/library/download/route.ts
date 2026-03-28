import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabaseAdmin
      .from("media")
      .select("id, type, url, storage_path")
      .eq("id", id)
      .single();

    if (error || !item) {
      return Response.json(
        {
          error: "Media item not found",
          details: error?.message,
        },
        { status: 404 }
      );
    }

    if (!item.url) {
      return Response.json(
        { error: "Missing file URL" },
        { status: 500 }
      );
    }

    return Response.redirect(item.url, 302);
  } catch (error: any) {
    console.error("LIBRARY DOWNLOAD ERROR:", error);

    return Response.json(
      {
        error: "Download failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}

