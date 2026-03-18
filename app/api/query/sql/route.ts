import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateSQL } from "@/lib/utils/sqlValidator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sql, datasetId } = body;

    if (!sql || !datasetId) {
      return NextResponse.json(
        { error: "Missing required fields: sql, datasetId" },
        { status: 400 }
      );
    }

    const validation = validateSQL(sql, datasetId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, rows: [] },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("exec_readonly_sql", {
      query: validation.sanitized,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, rows: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ rows: data || [] });
  } catch (error: any) {
    console.error("SQL query error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", rows: [] },
      { status: 500 }
    );
  }
}
