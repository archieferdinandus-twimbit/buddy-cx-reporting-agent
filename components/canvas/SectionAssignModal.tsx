"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { REPORT_SECTIONS } from "@/lib/constants/reportSections";
import type { ReportSectionId } from "@/types";

interface SectionAssignModalProps {
  onConfirm: (sectionId: ReportSectionId) => void;
  onClose: () => void;
}

export function SectionAssignModal({
  onConfirm,
  onClose,
}: SectionAssignModalProps) {
  const { taggedInsights } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const getInsightCount = (sectionId: ReportSectionId) =>
    taggedInsights.filter((i) => i.sectionId === sectionId).length;

  return (
    <div
      ref={ref}
      className="absolute right-0 bottom-full z-50 mb-1 w-56 animate-fade-in rounded-xl border border-cx-border bg-cx-surface-2 p-1.5 shadow-2xl shadow-black/40"
    >
      <div className="mb-1 px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-3">
          Add to section
        </span>
      </div>

      {REPORT_SECTIONS.map((section) => {
        const count = getInsightCount(section.id);
        return (
          <button
            key={section.id}
            onClick={() => {
              onConfirm(section.id);
              onClose();
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-cx-surface-3"
          >
            <span className="text-xs text-cx-text">{section.label}</span>
            {count > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cx-accent/15 px-1 text-[10px] font-medium text-cx-accent">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
