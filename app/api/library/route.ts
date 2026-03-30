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

    const mediaItems =
      mediaResult.data?.map((m) => ({
        ...m,
        item_kind: "media",
      })) ?? [];

    const planItems =
      plansResult.data?.map((p) => ({
        ...p,
        type: "plan",
        item_kind: "plan",
      })) ?? [];

    const items = [...mediaItems, ...planItems].sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    return NextResponse.json({ items });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load library." },
      { status: 500 }
    );
  }
}