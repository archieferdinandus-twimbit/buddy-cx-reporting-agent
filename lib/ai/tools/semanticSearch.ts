import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedSingleText } from "@/lib/embeddings/voyage";

export function getSemanticSearchTool(_datasetId: string) {
  return {
    name: "semantic_search",
    description:
      "Search qualitative notes using semantic similarity. Use for best practice discovery, qualitative evidence, and understanding 'why' behind scores.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural language search query",
        },
        top_k: {
          type: "number",
          description: "Number of results to return (default 10)",
        },
        pillar: {
          type: "string",
          description: "Optional filter: Digital, Service, Brand, or Employee",
        },
      },
      required: ["query"],
    },
  };
}

export async function executeSemanticSearch(
  datasetId: string,
  query: string,
  topK: number = 10,
  pillar?: string
) {
  const embedding = await embedSingleText(query);
  const embeddingStr = `[${embedding.join(",")}]`;
  const { data, error } = await supabaseAdmin.rpc("search_qualitative_chunks", {
    query_embedding: embeddingStr,
    match_count: topK,
    filter_pillar: pillar || null,
  });
  if (error) return { error: error.message, results: [] };
  return { results: data || [] };
}
