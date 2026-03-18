"use client";

import { useState } from "react";

interface AiRevisionBarProps {
  onSubmit: (instruction: string) => void;
  isLoading: boolean;
}

export function AiRevisionBar({ onSubmit, isLoading }: AiRevisionBarProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
    setInput("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-cx-border bg-cx-surface px-4 py-2.5"
    >
      <svg
        className="h-4 w-4 flex-shrink-0 text-cx-accent/60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
        />
      </svg>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask AI to revise this section..."
        className="flex-1 bg-transparent text-xs text-cx-text placeholder:text-cx-text-3 focus:outline-none"
        disabled={isLoading}
      />
      {isLoading ? (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-cx-accent animate-dot-bounce"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          className="text-[10px] font-medium text-cx-accent opacity-60 transition-opacity hover:opacity-100 disabled:opacity-20"
        >
          Revise
        </button>
      )}
    </form>
  );
}
