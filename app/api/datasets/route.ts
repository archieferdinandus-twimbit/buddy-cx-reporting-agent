import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/datasets — list all completed datasets
export async function GET() {
  try {
    const { data: datasets, error } = await supabaseAdmin
      .from("datasets")
      .select("id, name, year, country, company_count, uploaded_at, status")
      .eq("status", "complete")
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ datasets: datasets || [] });
  } catch (error: any) {
    console.error("List datasets error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
