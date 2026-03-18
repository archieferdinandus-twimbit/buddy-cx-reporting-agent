"use client";

import { useAppStore } from "@/store";
import { AnalyticsCanvas } from "./AnalyticsCanvas";
import { ReportEditor } from "@/components/report/ReportEditor";

export function RightPanel() {
  const { activeTab, setActiveTab, taggedInsights, canvasCards } =
    useAppStore();

  const insightCount = taggedInsights.length;
  const hasNewCards = canvasCards.length > 0;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-cx-bg">
      {/* Tab bar */}
      <div className="flex items-center border-b border-cx-border bg-cx-surface px-4">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === "analytics"
              ? "text-cx-accent"
              : "text-cx-text-3 hover:text-cx-text-2"
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Data Exploration
          {hasNewCards && activeTab !== "analytics" && (
            <span className="h-1.5 w-1.5 rounded-full bg-cx-accent animate-pulse" />
          )}
          {activeTab === "analytics" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cx-accent" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("report")}
          className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === "report"
              ? "text-cx-accent"
              : "text-cx-text-3 hover:text-cx-text-2"
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Report
          {insightCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cx-accent/15 px-1 text-[10px] font-medium text-cx-accent">
              {insightCount}
            </span>
          )}
          {activeTab === "report" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cx-accent" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === "analytics" ? <AnalyticsCanvas /> : <ReportEditor />}
      </div>
    </div>
  );
}
