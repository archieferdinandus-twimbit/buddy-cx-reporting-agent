"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useAppStore } from "@/store";

interface DashboardShellProps {
  children: React.ReactNode;
  reportId?: string;
  reportTitle?: string;
}

export function DashboardShell({ children, reportId: propReportId, reportTitle: propReportTitle }: DashboardShellProps) {
  const router = useRouter();
  const { currentDataset, currentReportId: storeReportId, currentReportTitle: storeReportTitle, isSaving, saveReport } = useAppStore();

  // Use props (from server) as fallback if store hasn't hydrated yet
  const currentReportId = storeReportId || propReportId || null;
  const currentReportTitle = storeReportTitle || propReportTitle || null;

  const handleSave = async () => {
    if (!currentReportId) return;
    try {
      await saveReport();
      toast.success("Draft saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleBack = async () => {
    if (currentReportId) {
      // Auto-save before navigating back
      try {
        await saveReport();
      } catch {
        // continue navigating even if save fails
      }
    }
    router.push("/dashboard");
  };

  return (
    <div className="flex h-screen flex-col bg-cx-bg">
      {/* Amber top accent line */}
      <div className="h-px w-full flex-shrink-0 bg-gradient-to-r from-transparent via-cx-accent to-transparent opacity-50" />

      {/* Header */}
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-cx-border bg-cx-surface px-6">
        <div className="flex items-center gap-3">
          {/* Back button — only shown on report workspace */}
          {currentReportId && (
            <button
              onClick={handleBack}
              className="mr-1 rounded-lg p-1.5 text-cx-text-3 transition-colors hover:bg-cx-surface-2 hover:text-cx-text"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <h1 className="font-display text-xl italic tracking-tight text-cx-text">
            Buddy<span className="text-cx-accent">CX</span>
          </h1>
          <div className="h-4 w-px bg-cx-border" />

          {currentReportTitle ? (
            <span className="max-w-[300px] truncate text-sm font-medium text-cx-text-2">
              {currentReportTitle}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cx-accent opacity-75">
              CX Reporting Agent
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save button — only on report workspace */}
          {currentReportId && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-cx-border px-3 py-1.5 text-xs font-medium text-cx-text-2 transition-colors hover:bg-cx-surface-2 hover:text-cx-text disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}

          {/* Export controls — only show when a dataset is loaded */}
          {currentDataset && <ExportDropdown />}

          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-cx-green animate-pulse" />
            <span className="text-xs text-cx-text-3">Claude Sonnet</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
