"use client";

import { useAppStore } from "@/store";
import { rowsToHtmlTable } from "@/lib/utils/tableToHtml";
import { toast } from "sonner";

interface ScoreResultCardProps {
  result: unknown;
  toolName: string;
  query?: string;
}

export function ScoreResultCard({ result, toolName, query }: ScoreResultCardProps) {
  const isAggregate = toolName === "compute_aggregate";
  const { setPendingTableInsert, setActiveTab } = useAppStore();

  // Unwrap the shaped responses from the tool executors:
  // query_scores     → { rows: [...] }
  // compute_aggregate → { result: [...] }
  // Fallback: plain array (defensive)
  const r = result as Record<string, unknown> | unknown[] | null;
  let rows: unknown[] = [];
  if (Array.isArray(r)) {
    rows = r;
  } else if (r && typeof r === "object") {
    if (Array.isArray((r as any).rows)) rows = (r as any).rows;
    else if (Array.isArray((r as any).result)) rows = (r as any).result;
  }

  const tableLabel = query
    ? query.length > 60
      ? query.slice(0, 57) + "..."
      : query
    : undefined;

  /** Switch to Report tab and open the floating table-placement card */
  const handleInsert = () => {
    const html = rowsToHtmlTable(rows as Record<string, unknown>[], tableLabel);
    setPendingTableInsert({
      rows: rows as Record<string, unknown>[],
      tableLabel,
      html,
    });
    setActiveTab("report");
    toast.success("Click 'Insert Here' in the report editor to place the table", {
      duration: 3000,
    });
  };

  if (rows.length === 0) {
    return (
      <div className="animate-fade-in rounded-xl border border-cx-border bg-cx-surface p-4">
        <div className="flex items-center gap-2 mb-2">
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
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-2">
            {isAggregate ? "Aggregation" : "Query Results"}
          </span>
        </div>
        <p className="text-xs text-cx-text-3">No results returned.</p>
      </div>
    );
  }

  const rawColumns = Object.keys(rows[0] as Record<string, unknown>);
  // Preferred column order: industry → company name → overall/cx_star → brand → service → employee → digital
  const PREFERRED_ORDER = [
    "industry",
    "company_name",
    "company",
    "name",
    "overall_score",
    "cx_star_rating",
    "overall",
    "brand_score",
    "brand",
    "service_score",
    "service",
    "employee_score",
    "employee",
    "digital_score",
    "digital",
  ];
  const columns = [
    ...PREFERRED_ORDER.filter((c) => rawColumns.includes(c)),
    ...rawColumns.filter((c) => !PREFERRED_ORDER.includes(c)),
  ];

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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-2">
            {isAggregate ? "Aggregation" : "Score Results"}
          </span>
          <span className="rounded-full bg-cx-surface-2 px-2 py-0.5 text-[10px] text-cx-text-3">
            {rows.length} rows
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-cx-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-cx-border bg-cx-surface-2">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium uppercase tracking-wider text-cx-text-3 text-[10px]"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows as Record<string, unknown>[]).slice(0, 20).map((row, i) => (
              <tr
                key={i}
                className="border-b border-cx-border/50 transition-colors hover:bg-cx-surface-2/50"
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-cx-text-2">
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 20 && (
          <div className="border-t border-cx-border bg-cx-surface-2 px-3 py-1.5 text-center text-[10px] text-cx-text-3">
            Showing 20 of {rows.length} rows
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={handleInsert}
          className="flex items-center gap-1 rounded-md border border-cx-border bg-cx-surface-2 px-2.5 py-1.5 text-[10px] font-medium text-cx-text-2 transition-colors hover:border-cx-border-2 hover:text-cx-text"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Insert Table
        </button>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return String(value);
}
