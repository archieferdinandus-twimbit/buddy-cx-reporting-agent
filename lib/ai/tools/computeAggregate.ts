import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateSQL } from "@/lib/utils/sqlValidator";

export function getComputeAggregateTool(_datasetId: string) {
  return {
    name: "compute_aggregate",
    description:
      "Compute aggregations (AVG, COUNT, MIN, MAX, SUM, percentiles) on the CX Stars scoring data. The LLM must NEVER perform math calculations — always use this tool instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "SQL SELECT with aggregate functions. Use $DATASET_ID placeholder. Example: SELECT industry, ROUND(AVG(digital_score)::numeric, 2) as avg_digital FROM companies WHERE dataset_id = $DATASET_ID GROUP BY industry",
        },
        purpose: {
          type: "string",
          description: "What calculation this performs",
        },
      },
      required: ["sql", "purpose"],
    },
  };
}

export async function executeComputeAggregate(datasetId: string, sql: string) {
  const validation = validateSQL(sql, datasetId);
  if (!validation.valid) {
    return { error: validation.error, result: null };
  }
  const { data, error } = await supabaseAdmin.rpc("exec_readonly_sql", {
    query: validation.sanitized,
  });
  if (error) return { error: error.message, result: null };
  return { result: data || [] };
}
