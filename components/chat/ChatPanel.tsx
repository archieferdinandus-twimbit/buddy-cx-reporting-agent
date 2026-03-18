"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgentChat } from "@/hooks/useAgentChat";
import { MessageBubble } from "./MessageBubble";
import { useAppStore } from "@/store";
import { toast } from "sonner";

const EXAMPLE_PROMPTS = [
  "Compare Banking companies on Digital Experience",
  "Which company has the highest NPS in Retail?",
  "Show best practices for Omnichannel CX",
];

export function ChatPanel() {
  const { messages, sendMessage, stopGeneration, isLoading } = useAgentChat();
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentDataset, clearSession, clearMessages, messages: storeMessages } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleClearData = async () => {
    if (!currentDataset) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setIsClearing(true);
    try {
      const res = await fetch("/api/dataset/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: currentDataset.id }),
      });
      if (!res.ok) throw new Error("Failed to clear dataset");
      clearSession();
      // Refresh server data so initialDataset becomes null → DropZone renders
      router.refresh();
      toast.success("Dataset cleared", {
        description: "Upload a new file to start a fresh analysis.",
        duration: 3000,
      });
    } catch {
      toast.error("Failed to clear dataset — please try again.");
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-cx-surface">
      {/* Header */}
      <div className="border-b border-cx-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cx-accent" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cx-text-2">
              Intelligence Query
            </h2>
          </div>

          {/* Right-side action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Clear Chat button — only shown when there are messages */}
            {storeMessages.length > 0 && !isLoading && (
              <button
                onClick={() => clearMessages()}
                title="Clear chat history"
                className="flex items-center gap-1 rounded-md border border-cx-border px-2 py-1 text-[10px] text-cx-text-3 transition-colors hover:border-cx-border-2 hover:text-cx-text"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Clear chat
              </button>
            )}

            {/* Clear Data button — only shown when a dataset is active */}
            {currentDataset && (
            <div className="flex items-center gap-1.5">
              {confirmClear ? (
                <>
                  <span className="text-[10px] text-cx-red">Sure?</span>
                  <button
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="rounded-md border border-cx-red/30 bg-cx-red/10 px-2 py-1 text-[10px] font-medium text-cx-red transition-colors hover:bg-cx-red/20 disabled:opacity-50"
                  >
                    {isClearing ? "Clearing…" : "Yes, clear"}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="rounded-md px-2 py-1 text-[10px] text-cx-text-3 hover:text-cx-text-2"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClearData}
                  title="Delete this dataset and start fresh"
                  className="flex items-center gap-1 rounded-md border border-cx-border px-2 py-1 text-[10px] text-cx-text-3 transition-colors hover:border-cx-red/30 hover:text-cx-red"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Data
                </button>
              )}
            </div>
          )}
          </div>{/* end right-side action buttons */}
        </div>
        <p className="mt-1 text-xs text-cx-text-3">
          Ask questions about your CX benchmark data
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-xs text-cx-text-3">Try asking:</p>
            <div className="w-full space-y-2">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="block w-full rounded-lg border border-cx-border bg-cx-surface-2 px-4 py-2.5 text-left text-xs text-cx-text-2 transition-colors hover:border-cx-border-2 hover:text-cx-text"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-cx-border bg-cx-surface-2 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-cx-accent animate-dot-bounce"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-cx-border p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your CX data…"
            className="flex-1 rounded-xl border border-cx-border bg-cx-surface-2 px-4 py-2.5 text-sm text-cx-text placeholder:text-cx-text-3 focus:border-cx-border-2 focus:outline-none focus:ring-1 focus:ring-cx-accent/30 disabled:opacity-50 transition-colors"
            disabled={isLoading}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cx-red/30 bg-cx-red/10 text-cx-red transition-colors hover:bg-cx-red/20"
              aria-label="Stop generation"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cx-accent/30 bg-cx-accent/10 text-cx-accent transition-colors hover:bg-cx-accent/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Send message"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
