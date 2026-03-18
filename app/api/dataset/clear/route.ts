import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(req: NextRequest) {
  try {
    const { datasetId } = await req.json();
    if (!datasetId) {
      return NextResponse.json({ error: "Missing datasetId" }, { status: 400 });
    }

    // Verify dataset exists
    const { data: dataset } = await supabaseAdmin
      .from("datasets")
      .select("id")
      .eq("id", datasetId)
      .single();

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Delete qualitative_chunks for all companies in this dataset
    const { data: companies } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("dataset_id", datasetId);

    if (companies?.length) {
      const companyIds = companies.map((c) => c.id);
      await supabaseAdmin
        .from("qualitative_chunks")
        .delete()
        .in("company_id", companyIds);
    }

    // Delete companies
    await supabaseAdmin
      .from("companies")
      .delete()
      .eq("dataset_id", datasetId);

    // Delete dataset
    await supabaseAdmin.from("datasets").delete().eq("id", datasetId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Dataset clear error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
