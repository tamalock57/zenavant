import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {

  const { data, error } =
    await supabaseAdmin
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data);
}