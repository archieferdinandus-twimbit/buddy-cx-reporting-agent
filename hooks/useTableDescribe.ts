"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import type { ReportSectionId } from "@/types";

export function useTableDescribe() {
  const [isDescribing, setIsDescribing] = useState(false);
  const { setPendingAiContent } = useAppStore();

  async function describe(
    tableRows: Record<string, unknown>[],
    tableLabel: string | undefined,
    sectionId: ReportSectionId,
    userPrompt: string
  ): Promise<void> {
    setIsDescribing(true);
    let accumulated = "";

    try {
      const res = await fetch("/api/report/describe-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableRows, tableLabel, userPrompt, sectionId }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start description stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.html) {
              accumulated += parsed.html;
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      // Queue as pending diff — user must Accept or Discard before it's committed
      if (accumulated) {
        setPendingAiContent({ sectionId, html: accumulated });
      }
    } finally {
      setIsDescribing(false);
    }
  }

  return { describe, isDescribing };
}
