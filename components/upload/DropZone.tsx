"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAppStore } from "@/store";
import { toast } from "sonner";
import { IngestionProgress } from "./IngestionProgress";

export function DropZone() {
  const { setCurrentDataset, isIngesting, setIsIngesting } = useAppStore();
  const [stage, setStage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith(".xlsx")) {
        toast.error("Please upload an .xlsx file");
        return;
      }

      setIsIngesting(true);
      setStage("Uploading file…");
      setProgress(0);
      setEtaSeconds(null);
      startTimeRef.current = Date.now();

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
        let finalResult: { dataset: unknown; metadata: { companyCount: number; industryCount: number } } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          // SSE lines are separated by \n\n; split and keep partial last chunk
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) throw new Error(data.error);

              if (typeof data.progress === "number") {
                setProgress(data.progress);

                // Compute ETA from elapsed time + current progress rate
                if (startTimeRef.current && data.progress > 5 && data.progress < 100) {
                  const elapsedMs = Date.now() - startTimeRef.current;
                  const rate = data.progress / elapsedMs; // % per ms
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

        if (!finalResult) throw new Error("Upload incomplete — no result received");

        toast.success(
          `Ingested ${finalResult.metadata.companyCount} companies across ${finalResult.metadata.industryCount} industries`
        );
        setCurrentDataset(finalResult.dataset as Parameters<typeof setCurrentDataset>[0]);
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
    [setCurrentDataset, setIsIngesting]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: isIngesting,
  });

  if (isIngesting) {
    return <IngestionProgress stage={stage} progress={progress} etaSeconds={etaSeconds} />;
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-cx-bg p-8">
      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--cx-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
        }}
      />

      {/* Amber ambient glow — fades in on drag */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isDragActive ? 1 : 0,
          background:
            "radial-gradient(ellipse at center, rgba(232,160,69,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-lg animate-slide-up">
        {/* Eyebrow label */}
        <p className="mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-cx-accent opacity-70">
          Twimbit · CX Stars Benchmarking
        </p>

        {/* Drop area */}
        <div
          {...getRootProps()}
          className={`group relative cursor-pointer rounded-2xl border p-12 text-center transition-all duration-300 ${
            isDragActive
              ? "border-cx-accent bg-cx-surface-2"
              : "border-cx-border bg-cx-surface hover:border-cx-border-2 hover:bg-cx-surface-2"
          }`}
          style={
            isDragActive
              ? { boxShadow: "0 0 48px rgba(232,160,69,0.12), inset 0 0 24px rgba(232,160,69,0.04)" }
              : {}
          }
        >
          <input {...getInputProps()} />

          {/* Icon */}
          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border transition-all duration-300 ${
              isDragActive
                ? "border-cx-accent bg-cx-accent-muted"
                : "border-cx-border bg-cx-surface-3 group-hover:border-cx-border-2"
            }`}
          >
            {isDragActive ? (
              <svg className="h-7 w-7 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-cx-text-2 transition-colors group-hover:text-cx-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            )}
          </div>

          {/* Heading */}
          <p className={`mb-2 text-base font-medium transition-colors ${isDragActive ? "text-cx-accent" : "text-cx-text"}`}>
            {isDragActive ? "Release to upload" : "Upload your CX workbook"}
          </p>

          {/* Subtext */}
          <p className="text-sm text-cx-text-3">
            Drag and drop your{" "}
            <span className="font-mono text-cx-text-2">.xlsx</span> file, or{" "}
            <span className="text-cx-accent underline-offset-2 hover:underline">
              click to browse
            </span>
          </p>

          {/* Divider */}
          <div className="mt-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-cx-border" />
            <span className="text-[10px] uppercase tracking-widest text-cx-text-3">
              Excel · CX Analysts format
            </span>
            <div className="h-px flex-1 bg-cx-border" />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-cx-text-3">
          Data is processed locally and never stored externally
        </p>
      </div>
    </div>
  );
}
