"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store";
import { toast } from "sonner";

export function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { reportSections, currentDataset } = useAppStore();

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasSections = Object.values(reportSections).some(
    (s) => s.status !== "empty" && s.html
  );

  const handleExport = async (format: "docx" | "pdf") => {
    if (!hasSections) {
      toast.info("No report content to export", {
        description: "Generate some report sections first.",
      });
      return;
    }

    setExporting(format);
    setOpen(false);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportSections,
          title: currentDataset
            ? `CX Stars Report — ${currentDataset.name}`
            : "CX Stars Report",
          datasetName: currentDataset?.name,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${response.status})`);
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "docx" ? "docx" : "pdf";
      const name = currentDataset
        ? `CX_Stars_Report_${currentDataset.name.replace(/\s+/g, "_")}`
        : "CX_Stars_Report";
      a.download = `${name}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (error: any) {
      console.error(`${format} export error:`, error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Download button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting !== null}
        className="flex items-center gap-1.5 rounded-lg border border-cx-border bg-cx-surface-2 px-3 py-1.5 text-xs font-medium text-cx-text-2 transition-colors hover:border-cx-border-2 hover:text-cx-text disabled:opacity-50"
      >
        {exporting ? (
          <>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full bg-cx-accent animate-dot-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
            Exporting {exporting.toUpperCase()}...
          </>
        ) : (
          <>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 animate-fade-in rounded-xl border border-cx-border bg-cx-surface-2 p-1.5 shadow-2xl shadow-black/40">
          <button
            onClick={() => handleExport("docx")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-cx-text transition-colors hover:bg-cx-surface-3"
          >
            <svg
              className="h-4 w-4 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <div>
              <div className="font-medium">Word Document</div>
              <div className="text-[10px] text-cx-text-3">.docx format</div>
            </div>
          </button>

          <button
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-cx-text transition-colors hover:bg-cx-surface-3"
          >
            <svg
              className="h-4 w-4 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <div>
              <div className="font-medium">PDF Document</div>
              <div className="text-[10px] text-cx-text-3">.pdf format</div>
            </div>
          </button>

        </div>
      )}
    </div>
  );
}
