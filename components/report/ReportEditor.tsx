"use client";

import { useCallback, useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { TiptapEditor } from "./TiptapEditor";
import { AiRevisionBar } from "./AiRevisionBar";
import { useReportDraft } from "@/hooks/useReportDraft";
import { toast } from "sonner";

export function ReportEditor() {
  const {
    activeSectionId,
    reportSections,
    updateSectionContent,
    setSectionStatus,
    taggedInsights,
    isDrafting,
    currentDataset,
  } = useAppStore();

  const { generateDraft } = useReportDraft();

  const currentSection = reportSections[activeSectionId];
  const sectionInsights = taggedInsights.filter((i) => i.sectionId === activeSectionId);

  // Editable document title — initialises from the dataset name
  const [reportTitle, setReportTitle] = useState(
    currentDataset?.name ?? "Untitled Report"
  );
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  // Keep the title in sync if the dataset changes (e.g. after upload)
  useEffect(() => {
    if (currentDataset?.name) {
      setReportTitle(currentDataset.name);
    }
  }, [currentDataset?.name]);

  const handleEditorUpdate = useCallback(
    (html: string) => {
      updateSectionContent(activeSectionId, html);
      if (currentSection.status === "draft") {
        setSectionStatus(activeSectionId, "edited");
      }
    },
    [activeSectionId, currentSection.status, updateSectionContent, setSectionStatus]
  );

  const handleRevision = (instruction: string) => {
    if (!currentDataset) return;
    if (!currentSection.html) {
      toast.info("Generate a draft first before requesting revisions.");
      return;
    }
    generateDraft(
      activeSectionId,
      sectionInsights,
      currentDataset.id,
      currentSection.html,
      instruction
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Document title area */}
        <div className="border-b border-cx-border bg-cx-surface px-8 pb-5 pt-6">
          {/* Editable report title */}
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => setIsTitleFocused(false)}
            placeholder="Untitled Report"
            className={`w-full bg-transparent font-display text-2xl font-semibold italic tracking-tight text-cx-text placeholder:text-cx-text-3/40 focus:outline-none ${
              isTitleFocused ? "border-b border-cx-accent/40" : "border-b border-transparent"
            } pb-0.5 transition-colors`}
          />
        </div>

        {/* Tiptap editor */}
        <TiptapEditor
          content={currentSection.html}
          onUpdate={handleEditorUpdate}
          editable={!isDrafting}
        />

        {/* AI revision bar */}
        <AiRevisionBar onSubmit={handleRevision} isLoading={isDrafting} />
      </div>
    </div>
  );
}
