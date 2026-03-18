"use client";

import { useAppStore } from "@/store";
import type { PendingAiContent } from "@/types";

interface AiDiffPreviewProps {
  pending: PendingAiContent;
}

export function AiDiffPreview({ pending }: AiDiffPreviewProps) {
  const { acceptAiContent, discardAiContent } = useAppStore();

  return (
    <div className="mx-6 mb-4 animate-fade-in overflow-hidden rounded-xl border border-cx-green/20 bg-cx-green/5 shadow-lg shadow-black/20">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-cx-green/15 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cx-green" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-green">
              AI Generated
            </span>
          </div>
          <span className="text-[10px] text-cx-text-3">
            Review before adding to your report
          </span>
        </div>

        {/* Accept / Discard */}
        <div className="flex items-center gap-2">
          <button
            onClick={discardAiContent}
            className="flex items-center gap-1 rounded-md border border-cx-border px-2.5 py-1.5 text-[10px] font-medium text-cx-text-3 transition-colors hover:border-cx-red/30 hover:text-cx-red"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Discard
          </button>
          <button
            onClick={acceptAiContent}
            className="flex items-center gap-1 rounded-md border border-cx-green/30 bg-cx-green/10 px-2.5 py-1.5 text-[10px] font-medium text-cx-green transition-colors hover:bg-cx-green/20"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
        </div>
      </div>

      {/* Preview content — italic + green tinted background */}
      <div
        className="ai-diff-preview max-h-48 overflow-y-auto px-5 py-4"
        dangerouslySetInnerHTML={{ __html: pending.html }}
      />
    </div>
  );
}
