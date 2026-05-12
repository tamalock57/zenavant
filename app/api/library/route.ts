import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Get auth token from header (mobile) or cookie (web)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token and get user
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch media for this user
    const { data, error } = await supabaseAdmin
      .from("media")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // If user_id column doesn't exist, fall back to returning all
      const { data: allData, error: allError } = await supabaseAdmin
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });

      if (allError) return Response.json({ error: allError.message }, { status: 500 });
      return Response.json({ items: allData || [] });
    }

    return Response.json({ items: data || [] });
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Failed to load library" },
      { status: 500 }
    );
  }
}