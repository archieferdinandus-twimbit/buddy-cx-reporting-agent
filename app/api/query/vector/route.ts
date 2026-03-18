import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedSingleText } from "@/lib/embeddings/voyage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, topK = 10, pillar, datasetId } = body;

    if (!query || !datasetId) {
      return NextResponse.json(
        { error: "Missing required fields: query, datasetId" },
        { status: 400 }
      );
    }

    const embedding = await embedSingleText(query);
    const embeddingStr = `[${embedding.join(",")}]`;

    const { data, error } = await supabaseAdmin.rpc("search_qualitative_chunks", {
      query_embedding: embeddingStr,
      match_count: topK,
      filter_pillar: pillar || null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, results: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ results: data || [] });
  } catch (error: any) {
    console.error("Vector query error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", results: [] },
      { status: 500 }
    );
  }
}
