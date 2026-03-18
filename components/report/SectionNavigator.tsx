"use client";

import { useAppStore } from "@/store";
import { REPORT_SECTIONS } from "@/lib/constants/reportSections";
import type { ReportSectionId } from "@/types";

export function SectionNavigator() {
  const {
    activeSectionId,
    setActiveSectionId,
    reportSections,
    taggedInsights,
  } = useAppStore();

  const getInsightCount = (sectionId: ReportSectionId) =>
    taggedInsights.filter((i) => i.sectionId === sectionId).length;

  return (
    <div className="flex w-[200px] flex-shrink-0 flex-col border-r border-cx-border bg-cx-surface">
      {/* Header */}
      <div className="border-b border-cx-border px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cx-text-3">
          Report Sections
        </span>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {REPORT_SECTIONS.map((section) => {
          const isActive = activeSectionId === section.id;
          const sectionState = reportSections[section.id];
          const insightCount = getInsightCount(section.id);

          return (
            <button
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "bg-cx-surface-2 text-cx-text"
                  : "text-cx-text-2 hover:bg-cx-surface-2/50 hover:text-cx-text"
              }`}
            >
              {/* Status dot */}
              <span
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  sectionState.status === "edited"
                    ? "bg-cx-green"
                    : sectionState.status === "draft"
                      ? "bg-cx-accent"
                      : "bg-cx-text-3/40"
                }`}
              />

              {/* Label */}
              <span className="flex-1 text-xs leading-tight">
                {section.label}
              </span>

              {/* Insight count badge */}
              {insightCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cx-accent/10 px-1 text-[10px] font-medium text-cx-accent">
                  {insightCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
