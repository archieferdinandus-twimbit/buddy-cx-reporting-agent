"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Database, Calendar, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NewReportModal } from "./NewReportModal";
import type { Report, Dataset } from "@/types";

interface DashboardHomeProps {
  initialReports: Report[];
  initialDatasets: Dataset[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-cx-text-3" },
  in_progress: { label: "In Progress", color: "bg-blue-500" },
  draft: { label: "Draft", color: "bg-cx-accent" },
  complete: { label: "Complete", color: "bg-cx-green" },
};

export function DashboardHome({ initialReports, initialDatasets }: DashboardHomeProps) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [datasets] = useState(initialDatasets);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleReportCreated = (reportId: string) => {
    setShowNewReportModal(false);
    router.push(`/dashboard/${reportId}`);
  };

  const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report");
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success("Report deleted");
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-screen flex-col bg-cx-bg">
      {/* Amber top accent line */}
      <div className="h-px w-full flex-shrink-0 bg-gradient-to-r from-transparent via-cx-accent to-transparent opacity-50" />

      {/* Header */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-cx-border bg-cx-surface px-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl italic tracking-tight text-cx-text">
            Buddy<span className="text-cx-accent">CX</span>
          </h1>
          <div className="h-4 w-px bg-cx-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cx-accent opacity-75">
            CX Reporting Agent
          </span>
        </div>

        <button
          onClick={() => setShowNewReportModal(true)}
          className="flex items-center gap-2 rounded-lg bg-cx-accent px-4 py-2 text-sm font-medium text-cx-bg transition-colors hover:bg-cx-accent/90"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Reports Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cx-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cx-text-2">
                My Reports
              </h2>
              <span className="ml-1 rounded-full bg-cx-surface-2 px-2 py-0.5 text-xs text-cx-text-3">
                {reports.length}
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cx-border bg-cx-surface/50 py-16">
                <div className="mb-4 rounded-full bg-cx-surface-2 p-4">
                  <FileText className="h-8 w-8 text-cx-text-3" />
                </div>
                <p className="mb-1 text-sm font-medium text-cx-text-2">No reports yet</p>
                <p className="mb-4 text-xs text-cx-text-3">
                  Create your first report to get started
                </p>
                <button
                  onClick={() => setShowNewReportModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-cx-accent px-4 py-2 text-sm font-medium text-cx-bg transition-colors hover:bg-cx-accent/90"
                >
                  <Plus className="h-4 w-4" />
                  New Report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => {
                  const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.new;
                  const datasetInfo = report.dataset as Dataset | undefined;

                  return (
                    <div
                      key={report.id}
                      onClick={() => router.push(`/dashboard/${report.id}`)}
                      className="group relative cursor-pointer rounded-xl border border-cx-border bg-cx-surface p-5 transition-all hover:border-cx-accent/40 hover:shadow-lg hover:shadow-cx-accent/5"
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteReport(e, report.id)}
                        disabled={deletingId === report.id}
                        className="absolute right-3 top-3 rounded-lg p-1.5 text-cx-text-3 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Title */}
                      <h3 className="mb-3 pr-8 text-sm font-semibold text-cx-text line-clamp-2">
                        {report.title}
                      </h3>

                      {/* Dataset badge */}
                      {datasetInfo && (
                        <div className="mb-3 flex items-center gap-1.5">
                          <Database className="h-3 w-3 text-cx-text-3" />
                          <span className="truncate text-xs text-cx-text-3">
                            {datasetInfo.name}
                          </span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.color}`} />
                          <span className="text-xs text-cx-text-3">{statusConf.label}</span>
                        </div>
                        <span className="text-xs text-cx-text-3">
                          {formatDate(report.updated_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* New report card */}
                <div
                  onClick={() => setShowNewReportModal(true)}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cx-border bg-cx-surface/50 p-5 transition-all hover:border-cx-accent/40 hover:bg-cx-surface"
                >
                  <div className="mb-2 rounded-full bg-cx-surface-2 p-3">
                    <Plus className="h-5 w-5 text-cx-text-3" />
                  </div>
                  <span className="text-xs font-medium text-cx-text-3">New Report</span>
                </div>
              </div>
            )}
          </section>

          {/* Datasets Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-cx-accent" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cx-text-2">
                Available Datasets
              </h2>
              <span className="ml-1 rounded-full bg-cx-surface-2 px-2 py-0.5 text-xs text-cx-text-3">
                {datasets.length}
              </span>
            </div>

            {datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-cx-border bg-cx-surface/50 py-8 text-center">
                <p className="text-xs text-cx-text-3">
                  No datasets uploaded yet. Upload one when creating a new report.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-cx-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cx-border bg-cx-surface">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cx-text-3">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cx-text-3">
                        Country
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-cx-text-3">
                        Companies
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-cx-text-3">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds) => (
                      <tr
                        key={ds.id}
                        className="border-b border-cx-border/50 bg-cx-surface/50 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Database className="h-3.5 w-3.5 flex-shrink-0 text-cx-accent/60" />
                            <span className="text-sm text-cx-text">{ds.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-cx-text-2">{ds.country}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-cx-text-3" />
                            <span className="text-sm text-cx-text-2">
                              {ds.company_count ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-cx-text-3" />
                            <span className="text-xs text-cx-text-3">
                              {formatDate(ds.uploaded_at)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* New Report Modal */}
      {showNewReportModal && (
        <NewReportModal
          datasets={datasets}
          onClose={() => setShowNewReportModal(false)}
          onCreated={handleReportCreated}
        />
      )}
    </div>
  );
}
