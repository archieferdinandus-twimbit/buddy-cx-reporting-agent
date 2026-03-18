"use client";

interface CompanyProfileCardProps {
  result: {
    company?: {
      company_name?: string;
      industry?: string;
      cx_star_rating?: number | null;
      cx_star_mastery?: string | null;
      digital_score?: number | null;
      service_score?: number | null;
      brand_score?: number | null;
      employee_score?: number | null;
    };
    qualitative_chunks?: Array<{
      pillar?: string;
      content?: string;
    }>;
  };
}

const PILLAR_COLORS: Record<string, string> = {
  Digital: "bg-blue-500/20 text-blue-400",
  Service: "bg-emerald-500/20 text-emerald-400",
  Brand: "bg-purple-500/20 text-purple-400",
  Employee: "bg-orange-500/20 text-orange-400",
};

const MASTERY_COLORS: Record<string, string> = {
  Exceptional: "text-cx-accent border-cx-accent/30 bg-cx-accent/10",
  Advanced: "text-cx-green border-cx-green/30 bg-cx-green/10",
  Proficient: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  Developing: "text-cx-text-2 border-cx-border-2 bg-cx-surface-2",
  Emerging: "text-cx-text-3 border-cx-border bg-cx-surface-2",
};

export function CompanyProfileCard({ result }: CompanyProfileCardProps) {
  const company = result?.company;
  if (!company) return null;

  const pillars = [
    { label: "Digital", score: company.digital_score },
    { label: "Service", score: company.service_score },
    { label: "Brand", score: company.brand_score },
    { label: "Employee", score: company.employee_score },
  ];

  const masteryClass =
    MASTERY_COLORS[company.cx_star_mastery || ""] || MASTERY_COLORS.Developing;

  return (
    <div className="animate-fade-in rounded-xl border border-cx-border bg-cx-surface p-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-cx-text">
            {company.company_name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-cx-surface-3 px-2 py-0.5 text-[10px] text-cx-text-3">
              {company.industry}
            </span>
            {company.cx_star_mastery && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${masteryClass}`}
              >
                {company.cx_star_mastery}
              </span>
            )}
          </div>
        </div>
        {company.cx_star_rating != null && (
          <div className="text-right">
            <div className="text-2xl font-semibold text-cx-accent">
              {company.cx_star_rating.toFixed(2)}
            </div>
            <div className="text-[10px] text-cx-text-3">CX Star Rating</div>
          </div>
        )}
      </div>

      {/* Pillar scores */}
      <div className="grid grid-cols-2 gap-2">
        {pillars.map((p) => (
          <div
            key={p.label}
            className="rounded-lg border border-cx-border bg-cx-surface-2 p-2.5"
          >
            <div className="mb-1 text-[10px] font-medium text-cx-text-3">
              {p.label}
            </div>
            <div className="flex items-end justify-between">
              <span className="text-lg font-semibold text-cx-text">
                {p.score != null ? p.score.toFixed(2) : "—"}
              </span>
              {p.score != null && (
                <div className="h-1 w-12 overflow-hidden rounded-full bg-cx-surface-3">
                  <div
                    className="h-full rounded-full bg-cx-accent/60"
                    style={{ width: `${(p.score / 5) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Qualitative highlights */}
      {result.qualitative_chunks && result.qualitative_chunks.length > 0 && (
        <div className="mt-3 border-t border-cx-border pt-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cx-text-3">
            Qualitative Highlights
          </div>
          <div className="space-y-1.5">
            {result.qualitative_chunks.slice(0, 3).map((chunk, i) => (
              <div
                key={i}
                className="rounded-md bg-cx-surface-2 p-2 text-xs text-cx-text-2"
              >
                {chunk.pillar && (
                  <span
                    className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PILLAR_COLORS[chunk.pillar] || "bg-cx-surface-3 text-cx-text-3"}`}
                  >
                    {chunk.pillar}
                  </span>
                )}
                <span className="line-clamp-2">{chunk.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
