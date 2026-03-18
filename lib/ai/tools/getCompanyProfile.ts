import { supabaseAdmin } from "@/lib/supabase/admin";

export function getCompanyProfileTool(_datasetId: string) {
  return {
    name: "get_company_profile",
    description:
      "Get a comprehensive profile for a specific company, including all scores and qualitative notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        company_name: {
          type: "string",
          description: "The company name to look up",
        },
      },
      required: ["company_name"],
    },
  };
}

export async function executeGetCompanyProfile(
  datasetId: string,
  companyName: string
) {
  // Get company data
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("dataset_id", datasetId)
    .ilike("company_name", `%${companyName}%`)
    .single();

  if (companyError || !company) {
    return {
      error: companyError?.message || "Company not found",
      company: null,
      qualitativeNotes: [],
    };
  }

  // Get qualitative chunks
  const { data: chunks } = await supabaseAdmin
    .from("qualitative_chunks")
    .select("chunk_type, pillar, content")
    .eq("company_id", company.id);

  return { company, qualitativeNotes: chunks || [] };
}
