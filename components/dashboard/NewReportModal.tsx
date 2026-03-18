"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Database, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { IngestionProgress } from "@/components/upload/IngestionProgress";
import type { Dataset } from "@/types";

interface NewReportModalProps {
  datasets: Dataset[];
  onClose: () => void;
  onCreated: (reportId: string) => void;
}

type Tab = "existing" | "upload";

export function NewReportModal({ datasets, onClose, onCreated }: NewReportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(datasets.length > 0 ? "existing" : "upload");
  const [reportTitle, setReportTitle] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Upload state
  const [isIngesting, setIsIngesting] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [uploadedDataset, setUploadedDataset] = useState<Dataset | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const handleCreateReport = async (datasetId: string) => {
    if (!reportTitle.trim()) {
      toast.error("Please enter a report title");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          datasetId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create report");
      }

      const { report } = await res.json();
      toast.success("Report created");
      onCreated(report.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create report");
    } finally {
      setIsCreating(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith(".xlsx")) {
        toast.error("Please upload an .xlsx file");
        return;
      }

      setIsIngesting(true);
      setStage("Uploading file...");
      setProgress(0);
      setEtaSeconds(null);
      startTimeRef.current = Date.now();

      // Auto-fill report title from filename if empty
      if (!reportTitle) {
        setReportTitle(file.name.replace(".xlsx", "") + " Report");
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name.replace(".xlsx", ""));

        const response = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.body) {
          const err = await response.json();
          throw new Error(err.error || "Ingestion failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: { dataset: any; metadata: any } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);

              if (typeof data.progress === "number") {
                setProgress(data.progress);
                if (startTimeRef.current && data.progress > 5 && data.progress < 100) {
                  const elapsedMs = Date.now() - startTimeRef.current;
                  const rate = data.progress / elapsedMs;
                  const remainingMs = (100 - data.progress) / rate;
                  setEtaSeconds(Math.max(1, Math.ceil(remainingMs / 1000)));
                } else if (data.progress >= 100) {
                  setEtaSeconds(null);
                }
              }

              if (data.stage) setStage(data.stage);
              if (data.result) finalResult = data.result;
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                throw parseErr;
              }
            }
          }
        }

        if (!finalResult) throw new Error("Upload incomplete");

        toast.success(
          `Ingested ${finalResult.metadata.companyCount} companies across ${finalResult.metadata.industryCount} industries`
        );
        setUploadedDataset(finalResult.dataset as Dataset);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsIngesting(false);
        setStage("");
        setProgress(0);
        setEtaSeconds(null);
        startTimeRef.current = null;
      }
    },
    [reportTitle]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: isIngesting || !!uploadedDataset,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-cx-border bg-cx-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cx-border px-6 py-4">
          <h2 className="text-base font-semibold text-cx-text">New Report</h2>
          <button
            onClick={onClose}
            disabled={isIngesting}
            className="rounded-lg p-1.5 text-cx-text-3 transition-colors hover:bg-cx-surface-2 hover:text-cx-text disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Report title input */}
        <div className="border-b border-cx-border px-6 py-4">
          <label className="mb-1.5 block text-xs font-medium text-cx-text-2">
            Report Title
          </label>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="e.g. CX Stars Malaysia 2025 Report"
            className="w-full rounded-lg border border-cx-border bg-cx-bg px-3 py-2 text-sm text-cx-text placeholder-cx-text-3 outline-none focus:border-cx-accent"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cx-border px-6">
          <button
            onClick={() => setActiveTab("existing")}
            disabled={isIngesting}
            className={`relative px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === "existing"
                ? "text-cx-accent"
                : "text-cx-text-3 hover:text-cx-text-2"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Select Dataset
            </div>
            {activeTab === "existing" && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cx-accent" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            disabled={isIngesting}
            className={`relative px-4 py-3 text-xs font-medium transition-colors ${
              activeTab === "upload"
                ? "text-cx-accent"
                : "text-cx-text-3 hover:text-cx-text-2"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload New
            </div>
            {activeTab === "upload" && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cx-accent" />
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="px-6 py-4">
          {activeTab === "existing" ? (
            <div className="space-y-2">
              {datasets.length === 0 ? (
                <p className="py-8 text-center text-xs text-cx-text-3">
                  No datasets available. Upload one in the &ldquo;Upload New&rdquo; tab.
                </p>
              ) : (
                <div className="max-h-60 space-y-1.5 overflow-y-auto">
                  {datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => setSelectedDatasetId(ds.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        selectedDatasetId === ds.id
                          ? "border-cx-accent bg-cx-accent/5"
                          : "border-cx-border hover:border-cx-border-2 hover:bg-cx-surface-2"
                      }`}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                        selectedDatasetId === ds.id
                          ? "bg-cx-accent text-cx-bg"
                          : "bg-cx-surface-2 text-cx-text-3"
                      }`}>
                        {selectedDatasetId === ds.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Database className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-cx-text">
                          {ds.name}
                        </p>
                        <p className="text-xs text-cx-text-3">
                          {ds.company_count} companies · {ds.country} · {ds.year}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {isIngesting ? (
                <div className="py-4">
                  <IngestionProgress stage={stage} progress={progress} etaSeconds={etaSeconds} />
                </div>
              ) : uploadedDataset ? (
                <div className="flex flex-col items-center py-6">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cx-green/10">
                    <Check className="h-6 w-6 text-cx-green" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-cx-text">
                    Dataset uploaded successfully
                  </p>
                  <p className="text-xs text-cx-text-3">
                    {uploadedDataset.name} · {uploadedDataset.company_count} companies
                  </p>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragActive
                      ? "border-cx-accent bg-cx-accent/5"
                      : "border-cx-border hover:border-cx-border-2 hover:bg-cx-surface-2"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cx-surface-2">
                    <Upload className={`h-5 w-5 ${isDragActive ? "text-cx-accent" : "text-cx-text-3"}`} />
                  </div>
                  <p className="mb-1 text-sm font-medium text-cx-text">
                    {isDragActive ? "Drop to upload" : "Drop your .xlsx file here"}
                  </p>
                  <p className="text-xs text-cx-text-3">
                    or <span className="text-cx-accent">click to browse</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-cx-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={isIngesting || isCreating}
            className="rounded-lg px-4 py-2 text-sm text-cx-text-3 transition-colors hover:bg-cx-surface-2 hover:text-cx-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const dsId = activeTab === "existing"
                ? selectedDatasetId
                : uploadedDataset?.id;
              if (!dsId) {
                toast.error("Please select or upload a dataset");
                return;
              }
              handleCreateReport(dsId);
            }}
            disabled={
              isIngesting ||
              isCreating ||
              !reportTitle.trim() ||
              (activeTab === "existing" && !selectedDatasetId) ||
              (activeTab === "upload" && !uploadedDataset)
            }
            className="flex items-center gap-2 rounded-lg bg-cx-accent px-4 py-2 text-sm font-medium text-cx-bg transition-colors hover:bg-cx-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
