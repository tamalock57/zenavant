import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { id, storage_path } = await req.json();

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    // 1. delete from database
    const { error: dbError } = await supabaseAdmin
      .from("media")
      .delete()
      .eq("id", id);

    if (dbError) {
      return Response.json(
        { error: "DB delete failed", details: dbError.message },
        { status: 500 }
      );
    }

    // 2. delete from storage (optional but important)
    if (storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("media")
        .remove([storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError.message);
      }
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