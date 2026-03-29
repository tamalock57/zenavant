import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, title, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      projects: data ?? [],
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = (body?.title ?? "").toString().trim();

    if (!title) {
      return Response.json(
        { error: "Project title is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        title,
        status: "active",
      })
      .select("id, title, status, created_at, updated_at")
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      project: data,
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }
}