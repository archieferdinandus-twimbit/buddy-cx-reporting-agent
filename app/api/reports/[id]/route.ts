import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/reports/[id] — get single report with dataset
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select("*, dataset:datasets(id, name, year, country, company_count, uploaded_at, status, file_url)")
      .eq("id", params.id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id] — update report (save draft)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, status, sections, tagged_insights, chat_history, canvas_cards } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (sections !== undefined) updates.sections = sections;
    if (tagged_insights !== undefined) updates.tagged_insights = tagged_insights;
    if (chat_history !== undefined) updates.chat_history = chat_history;
    if (canvas_cards !== undefined) updates.canvas_cards = canvas_cards;

    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Update report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] — delete a report
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from("reports")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
