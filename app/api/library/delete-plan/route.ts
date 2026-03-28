import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("plans")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json(
        { error: "Delete failed", details: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json(
      {
        error: "Delete failed",
        details: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}