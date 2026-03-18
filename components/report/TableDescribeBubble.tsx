"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store";
import { useTableDescribe } from "@/hooks/useTableDescribe";
import type { PendingTableDescription } from "@/types";

interface TableDescribeBubbleProps {
  pending: PendingTableDescription;
}

export function TableDescribeBubble({ pending }: TableDescribeBubbleProps) {
  const [prompt, setPrompt] = useState("");
  const { setPendingTableDescription } = useAppStore();
  const { describe, isDescribing } = useTableDescribe();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isDescribing) return;
    await describe(pending.tableRows, pending.tableLabel, pending.sectionId, prompt.trim());
    setPendingTableDescription(null);
  };

  const handleDismiss = () => {
    setPendingTableDescription(null);
  };

  return (
    <div className="mx-6 mb-4 animate-fade-in rounded-xl border border-cx-accent/20 bg-cx-accent/5 p-4 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-3.5 w-3.5 flex-shrink-0 text-cx-accent"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L13.09 8.26L19 7L15.45 11.85L21 14L15.45 16.15L19 21L13.09 15.74L12 22L10.91 15.74L5 21L8.55 16.15L3 14L8.55 11.85L5 7L10.91 8.26L12 2Z" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-accent">
          Ask AI to describe this data
        </span>
        {pending.tableLabel && (
          <span className="ml-auto max-w-[200px] truncate rounded-full bg-cx-surface-2 px-2 py-0.5 text-[10px] text-cx-text-3">
            {pending.tableLabel}
          </span>
        )}
      </div>

      {/* Textarea form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={(e) => {
            // Submit on Enter (without Shift for newline)
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (prompt.trim() && !isDescribing) {
                handleSubmit(e as unknown as React.FormEvent);
              }
            }
          }}
          placeholder={'e.g. "Summarize the top 3 performers and what makes them stand out"\n\nShift + Enter for a new line · Enter to generate'}
          disabled={isDescribing}
          rows={3}
          className="w-full resize-none rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-xs leading-relaxed text-cx-text placeholder:text-cx-text-3/70 focus:border-cx-accent/40 focus:outline-none disabled:opacity-50"
          style={{ minHeight: "72px", maxHeight: "180px", overflowY: "auto" }}
        />

        {/* Action row */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-cx-text-3">
            <kbd className="rounded border border-cx-border px-1 py-0.5 font-mono">↵</kbd> generate ·{" "}
            <kbd className="rounded border border-cx-border px-1 py-0.5 font-mono">⇧↵</kbd> new line
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isDescribing}
              className="rounded-lg px-3 py-1.5 text-[10px] font-medium text-cx-text-3 transition-colors hover:text-cx-text-2 disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || isDescribing}
              className="flex items-center gap-1.5 rounded-lg border border-cx-accent/30 bg-cx-accent/10 px-3 py-1.5 text-[10px] font-medium text-cx-accent transition-colors hover:bg-cx-accent/20 disabled:opacity-50"
            >
              {isDescribing ? (
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1 w-1 rounded-full bg-cx-accent animate-dot-bounce"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
