import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const [mediaResult, plansResult] = await Promise.all([
      supabaseAdmin
        .from("media")
        .select("*")
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("plans")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (mediaResult.error) {
      return NextResponse.json(
        { error: mediaResult.error.message },
        { status: 500 }
      );
    }

    if (plansResult.error) {
      return NextResponse.json(
        { error: plansResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      media: mediaResult.data ?? [],
      plans: plansResult.data ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load library." },
      { status: 500 }
    );
  }
}