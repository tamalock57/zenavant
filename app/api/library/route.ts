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

    const media = (mediaResult.data ?? []).map((item) => ({
      ...item,
      item_kind: "media",
    }));

    const plans = (plansResult.data ?? []).map((item) => ({
      ...item,
      item_kind: "plan",
      type: "plan",
      url: null,
      storage_path: null,
    }));

    const items = [...media, ...plans].sort((a: any, b: any) => {
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load library." },
      { status: 500 }
    );
  }
}