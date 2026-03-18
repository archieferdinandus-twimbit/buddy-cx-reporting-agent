"use client";


interface SemanticResult {
  id: string;
  company_name: string;
  industry: string;
  pillar: string | null;
  content: string;
  similarity: number;
}

interface SemanticSearchCardProps {
  results: SemanticResult[];
  query?: string;
}

export function SemanticSearchCard({ results, query }: SemanticSearchCardProps) {

  if (!results || results.length === 0) return null;

  return (
    <div className="animate-fade-in rounded-xl border border-cx-border bg-cx-surface p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-cx-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-2">
            Best Practices
          </span>
          <span className="rounded-full bg-cx-surface-2 px-2 py-0.5 text-[10px] text-cx-text-3">
            {results.length} results
          </span>
        </div>
      </div>

      {query && (
        <p className="mb-3 text-xs text-cx-text-3 italic">
          &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Results list */}
      <div className="space-y-2">
        {results.map((result) => (
          <div
            key={result.id}
            className="group relative rounded-lg border border-cx-border bg-cx-surface-2 p-3 transition-colors hover:border-cx-border-2"
          >
            {/* Company + Industry + Pillar */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-cx-text">
                {result.company_name}
              </span>
              <span className="rounded-full bg-cx-surface-3 px-2 py-0.5 text-[10px] text-cx-text-3">
                {result.industry}
              </span>
              {result.pillar && (
                <span className="rounded-full border border-cx-accent/20 bg-cx-accent/5 px-2 py-0.5 text-[10px] text-cx-accent">
                  {result.pillar}
                </span>
              )}
            </div>

            {/* Content snippet */}
            <p className="text-xs leading-relaxed text-cx-text-2 line-clamp-3">
              {result.content}
            </p>

            {/* Similarity bar + Mention in Report */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1 w-16 overflow-hidden rounded-full bg-cx-surface-3">
                  <div
                    className="h-full rounded-full bg-cx-accent/60"
                    style={{ width: `${Math.round(result.similarity * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-cx-text-3">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
