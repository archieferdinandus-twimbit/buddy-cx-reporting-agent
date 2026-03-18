import { createSupabaseServer } from "@/lib/supabase/server";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const supabase = createSupabaseServer();

  // Fetch all reports with their datasets
  const { data: reports } = await supabase
    .from("reports")
    .select("*, dataset:datasets(id, name, year, country, company_count, uploaded_at)")
    .order("updated_at", { ascending: false });

  // Fetch all completed datasets
  const { data: datasets } = await supabase
    .from("datasets")
    .select("id, name, year, country, file_url, company_count, uploaded_at, status")
    .eq("status", "complete")
    .order("uploaded_at", { ascending: false });

  return (
    <DashboardHome
      initialReports={reports || []}
      initialDatasets={datasets || []}
    />
  );
}
