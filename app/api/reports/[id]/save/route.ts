import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST /api/reports/[id]/save — save report state (used by sendBeacon on unload)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, sections, tagged_insights, chat_history, canvas_cards } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (sections !== undefined) updates.sections = sections;
    if (tagged_insights !== undefined) updates.tagged_insights = tagged_insights;
    if (chat_history !== undefined) updates.chat_history = chat_history;
    if (canvas_cards !== undefined) updates.canvas_cards = canvas_cards;

    await supabaseAdmin
      .from("reports")
      .update(updates)
      .eq("id", params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
