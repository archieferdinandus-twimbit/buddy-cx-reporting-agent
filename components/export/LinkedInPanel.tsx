"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { toast } from "sonner";

interface LinkedInPanelProps {
  onClose: () => void;
}

export function LinkedInPanel({ onClose }: LinkedInPanelProps) {
  const { reportSections, currentDataset } = useAppStore();
  const [post, setPost] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const hasSections = Object.values(reportSections).some(
    (s) => s.status !== "empty" && s.html
  );

  const charCount = post.length;
  const charLimit = 3000;

  const handleGenerate = async () => {
    if (!hasSections) {
      toast.info("No report content to generate a post from.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/export/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportSections,
          title: currentDataset
            ? `CX Stars Report — ${currentDataset.name}`
            : "CX Stars Report",
          datasetName: currentDataset?.name,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate post");
      }

      const data = await response.json();
      setPost(data.post);
      setHasGenerated(true);
    } catch (error: any) {
      toast.error(`Generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy — try selecting the text manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="animate-fade-in mx-4 flex w-full max-w-lg flex-col rounded-2xl border border-cx-border bg-cx-surface shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cx-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <svg
              className="h-5 w-5 text-[#0A66C2]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <h3 className="text-sm font-medium text-cx-text">
              LinkedIn Post Generator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-cx-text-3 transition-colors hover:bg-cx-surface-2 hover:text-cx-text"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          {!hasGenerated ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="mb-4 text-sm text-cx-text-2">
                Generate a LinkedIn post from your report content.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !hasSections}
                className="flex items-center gap-2 rounded-lg border border-cx-accent/30 bg-cx-accent/10 px-4 py-2 text-sm font-medium text-cx-accent transition-colors hover:bg-cx-accent/20 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-1 rounded-full bg-cx-accent animate-dot-bounce"
                          style={{ animationDelay: `${i * 0.18}s` }}
                        />
                      ))}
                    </div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    Generate Post
                  </>
                )}
              </button>
              {!hasSections && (
                <p className="mt-3 text-[10px] text-cx-text-3">
                  Write some report sections first to generate a post.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Post preview */}
              <textarea
                value={post}
                onChange={(e) => setPost(e.target.value)}
                rows={12}
                className="w-full resize-none rounded-lg border border-cx-border bg-cx-surface-2 p-4 text-sm leading-relaxed text-cx-text placeholder:text-cx-text-3 focus:border-cx-border-2 focus:outline-none focus:ring-1 focus:ring-cx-accent/30"
              />

              {/* Char count */}
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-[10px] ${charCount > charLimit ? "text-cx-red" : "text-cx-text-3"}`}
                >
                  {charCount} / {charLimit} characters
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="text-[10px] font-medium text-cx-accent transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  {isGenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {hasGenerated && (
          <div className="flex items-center justify-end gap-2 border-t border-cx-border px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-cx-text-3 transition-colors hover:text-cx-text"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-cx-accent/30 bg-cx-accent/10 px-4 py-1.5 text-xs font-medium text-cx-accent transition-colors hover:bg-cx-accent/20"
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
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
              </svg>
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
