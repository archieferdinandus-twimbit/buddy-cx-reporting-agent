"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store";
import type { ReportSectionId, TaggedInsight } from "@/types";

export function useReportDraft() {
  const {
    setIsDrafting,
    updateSectionContent,
    setSectionStatus,
  } = useAppStore();

  const abortRef = useRef<AbortController | null>(null);

  const generateDraft = useCallback(
    async (
      sectionId: ReportSectionId,
      insights: TaggedInsight[],
      datasetId: string,
      existingDraft?: string,
      userInstruction?: string
    ) => {
      setIsDrafting(true);
      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/report/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId,
            insights,
            datasetId,
            existingDraft,
            userInstruction,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Draft generation error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.html) {
                accumulated += parsed.html;
                updateSectionContent(sectionId, accumulated);
              }
              if (parsed.error) {
                console.error("Draft error:", parsed.error);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        setSectionStatus(sectionId, "draft");
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Draft generation failed:", error);
          updateSectionContent(
            sectionId,
            "<p><em>Draft generation failed. Please try again.</em></p>"
          );
        }
      } finally {
        setIsDrafting(false);
        abortRef.current = null;
      }
    },
    [setIsDrafting, updateSectionContent, setSectionStatus]
  );

  const stopDraft = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { generateDraft, stopDraft };
}
