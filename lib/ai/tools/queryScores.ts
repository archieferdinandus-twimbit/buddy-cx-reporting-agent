import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateSQL } from "@/lib/utils/sqlValidator";

export function getQueryScoresTool(_datasetId: string) {
  return {
    name: "query_scores",
    description:
      "Execute a read-only SQL SELECT query against the CX Stars scoring database. Use this for rankings, comparisons, and quantitative lookups. Always include WHERE dataset_id = $DATASET_ID in your query.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "PostgreSQL SELECT statement. Use $DATASET_ID as placeholder for the dataset ID.",
        },
        purpose: {
          type: "string",
          description: "Brief description of what this query answers",
        },
      },
      required: ["sql", "purpose"],
    },
  };
}

export async function executeQueryScores(datasetId: string, sql: string) {
  const validation = validateSQL(sql, datasetId);
  if (!validation.valid) {
    return { error: validation.error, rows: [] };
  }
  const { data, error } = await supabaseAdmin.rpc("exec_readonly_sql", {
    query: validation.sanitized,
  });
  if (error) return { error: error.message, rows: [] };
  return { rows: data || [] };
}
