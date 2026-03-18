import { createSupabaseServer } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ReportWorkspace } from "./ReportWorkspace";

interface Props {
  params: { reportId: string };
}

export default async function ReportPage({ params }: Props) {
  const supabase = createSupabaseServer();

  // Fetch report with joined dataset
  const { data: report, error } = await supabase
    .from("reports")
    .select("*, dataset:datasets(id, name, year, country, company_count, uploaded_at, status, file_url)")
    .eq("id", params.reportId)
    .single();

  if (error || !report) {
    notFound();
  }

  // Extract the dataset from the join (Supabase returns it as a nested object)
  const dataset = report.dataset || null;

  return (
    <DashboardShell reportId={report.id} reportTitle={report.title}>
      <ReportWorkspace
        reportId={report.id}
        reportTitle={report.title}
        initialDataset={dataset}
        initialSections={report.sections || {}}
        initialTaggedInsights={report.tagged_insights || []}
        initialChatHistory={report.chat_history || []}
        initialCanvasCards={report.canvas_cards || []}
        initialStatus={report.status}
      />
    </DashboardShell>
  );
}
