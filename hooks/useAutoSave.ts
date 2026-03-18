"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";

const AUTO_SAVE_INTERVAL = 2 * 60 * 1000; // 2 minutes

export function useAutoSave(reportId: string) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Periodic auto-save every 2 minutes if dirty
    timerRef.current = setInterval(() => {
      const { isDirty, isSaving, currentReportId, saveReport } = useAppStore.getState();
      if (isDirty && !isSaving && currentReportId) {
        saveReport().catch(console.error);
      }
    }, AUTO_SAVE_INTERVAL);

    // Save before tab close / navigate away
    const handleBeforeUnload = () => {
      const { isDirty, currentReportId, saveReport } = useAppStore.getState();
      if (isDirty && currentReportId) {
        // Use sendBeacon-style sync save for unload
        const state = useAppStore.getState();
        const hasDraftContent = Object.values(state.reportSections).some(
          (s) => s.status !== "empty"
        );
        const status = hasDraftContent ? "draft" : "in_progress";

        navigator.sendBeacon(
          `/api/reports/${currentReportId}/save`,
          new Blob(
            [
              JSON.stringify({
                status,
                sections: state.reportSections,
                tagged_insights: state.taggedInsights,
                chat_history: state.messages,
                canvas_cards: state.canvasCards,
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Save on unmount if dirty
      const { isDirty, isSaving, currentReportId, saveReport } = useAppStore.getState();
      if (isDirty && !isSaving && currentReportId) {
        saveReport().catch(console.error);
      }
    };
  }, [reportId]);
}
