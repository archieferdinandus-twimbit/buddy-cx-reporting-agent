"use client";

import { useAppStore } from "@/store";
import { SemanticSearchCard } from "./SemanticSearchCard";
import { ScoreResultCard } from "./ScoreResultCard";
import { CompanyProfileCard } from "./CompanyProfileCard";

export function AnalyticsCanvas() {
  const { canvasCards, currentDataset } = useAppStore();

  // Empty state
  if (canvasCards.length === 0) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8">
        {/* Subtle dot grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--cx-border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.6,
          }}
        />

        {/* Ambient center glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(232,160,69,0.04) 0%, transparent 65%)",
          }}
        />

        <div className="relative animate-slide-up text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cx-border-2 bg-cx-surface-2">
            <svg
              className="h-7 w-7 text-cx-accent opacity-80"
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
          </div>

          <h3 className="font-display text-2xl italic text-cx-text">
            Analytics Canvas
          </h3>
          <p className="mt-2 text-sm text-cx-text-3">
            Results from your queries will appear here
          </p>

          {/* Dataset info pill */}
          {currentDataset && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cx-border-2 bg-cx-surface px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cx-green" />
              <span className="text-xs text-cx-text-2">
                {currentDataset.name}
              </span>
              <span className="text-cx-border-2">&middot;</span>
              <span className="font-mono text-xs text-cx-text-3">
                {currentDataset.company_count} co &middot;{" "}
                {currentDataset.year} &middot; {currentDataset.country}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cards view
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {/* Dataset info bar */}
      {currentDataset && (
        <div className="flex items-center gap-2 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cx-green" />
          <span className="text-xs text-cx-text-2">{currentDataset.name}</span>
          <span className="text-cx-border-2">&middot;</span>
          <span className="font-mono text-xs text-cx-text-3">
            {currentDataset.company_count} co &middot; {currentDataset.year}
          </span>
        </div>
      )}

      {/* Render cards in reverse order (newest first) */}
      {[...canvasCards].reverse().map((card) => (
        <div key={card.id}>{renderCard(card)}</div>
      ))}
    </div>
  );
}

function renderCard(card: { id: string; toolName: string; query: string; result: unknown }) {
  switch (card.toolName) {
    case "semantic_search": {
      // semantic_search returns { results: [...] }
      const r = card.result as any;
      const results = Array.isArray(r)
        ? r
        : Array.isArray(r?.results)
          ? r.results
          : [];
      return <SemanticSearchCard results={results} query={card.query} />;
    }

    case "get_company_profile":
      return (
        <CompanyProfileCard result={card.result as any} />
      );

    case "query_scores":
    case "compute_aggregate": {
      // Skip cards with no data rows entirely
      const r = card.result as any;
      const rows = Array.isArray(r) ? r
        : Array.isArray(r?.rows) ? r.rows
        : Array.isArray(r?.result) ? r.result
        : [];
      if (rows.length === 0) return null;
      return (
        <ScoreResultCard result={card.result} toolName={card.toolName} query={card.query} />
      );
    }

    default:
      // Fallback: render as JSON
      return (
        <div className="animate-fade-in rounded-xl border border-cx-border bg-cx-surface p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-3">
            {card.toolName}
          </div>
          <pre className="overflow-x-auto rounded-lg bg-cx-surface-2 p-3 text-[10px] text-cx-text-2">
            {JSON.stringify(card.result, null, 2)}
          </pre>
        </div>
      );
  }
}
