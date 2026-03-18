import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/reports — list all reports (joined with dataset name)
export async function GET() {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from("reports")
      .select("*, dataset:datasets(id, name, year, country, company_count, uploaded_at)")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error("List reports error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/reports — create a new report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, datasetId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        title,
        dataset_id: datasetId || null,
        status: "new",
        sections: {},
        tagged_insights: [],
        chat_history: [],
        canvas_cards: [],
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
