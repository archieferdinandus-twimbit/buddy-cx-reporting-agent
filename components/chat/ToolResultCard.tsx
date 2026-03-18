interface ToolResultCardProps {
  toolName: string;
  result: unknown;
}

export function ToolResultCard({ toolName, result }: ToolResultCardProps) {
  return (
    <div className="my-2 rounded-lg border border-cx-border bg-cx-surface-2 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="h-1 w-1 rounded-full bg-cx-accent opacity-70" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-cx-accent opacity-70">
          Tool · {toolName}
        </span>
      </div>
      <pre className="max-h-40 overflow-auto font-mono text-xs text-cx-text-2">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
