"use client";

interface IngestionProgressProps {
  stage: string;
  progress: number;
  etaSeconds: number | null;
}

export function IngestionProgress({ stage, progress, etaSeconds }: IngestionProgressProps) {
  const stages = [
    { label: "Parsing rows and columns",    threshold: 30 },
    { label: "Embedding qualitative notes", threshold: 70 },
    { label: "Computing benchmark scores",  threshold: 90 },
  ];

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-cx-bg p-8">
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--cx-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in space-y-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cx-accent opacity-70">
            Processing
          </p>
          <h2 className="mt-2 font-display text-2xl italic text-cx-text">
            Analysing your workbook…
          </h2>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cx-text-3">Progress</span>
            <div className="flex items-center gap-2">
              {etaSeconds !== null && progress < 100 && (
                <span className="font-mono text-xs text-cx-text-3">
                  ~{etaSeconds > 60
                    ? `${Math.ceil(etaSeconds / 60)}m`
                    : `${etaSeconds}s`} left
                </span>
              )}
              <span className="font-mono text-xs text-cx-text-2">
                {progress}%
              </span>
            </div>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-cx-surface-2">
            <div
              className="h-full rounded-full bg-cx-accent transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px rgba(232,160,69,0.5)",
              }}
            />
          </div>
        </div>

        {/* Stage list */}
        <div className="space-y-4">
          {stages.map((s, i) => {
            const completed = progress >= s.threshold;
            const active = progress >= s.threshold - 30 && !completed;

            return (
              <div key={s.label} className="flex items-center gap-4">
                {/* Indicator */}
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                  {completed ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-cx-green bg-cx-green/10">
                      <svg
                        className="h-3 w-3 text-cx-green"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : active ? (
                    <div
                      className="h-4 w-4 rounded-full border-2 border-cx-accent border-t-transparent animate-spin-slow"
                    />
                  ) : (
                    <div className="h-2 w-2 rounded-full border border-cx-text-3" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`flex-1 text-sm transition-colors ${
                    completed
                      ? "text-cx-green"
                      : active
                      ? "font-medium text-cx-text"
                      : "text-cx-text-3"
                  }`}
                >
                  {s.label}
                </span>

                {/* Step number */}
                <span className="font-mono text-xs text-cx-text-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current stage text — live description from the server */}
        <p className="min-h-[1.25rem] text-center font-mono text-xs text-cx-text-3 transition-all duration-300">
          {stage || ""}
        </p>
      </div>
    </div>
  );
}
