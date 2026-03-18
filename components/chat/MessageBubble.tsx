"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-2 animate-fade-in ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="mb-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-cx-accent/30 bg-cx-accent/10">
          <span className="text-[9px] font-bold leading-none text-cx-accent">
            AI
          </span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
          isUser
            ? "rounded-br-sm border border-cx-accent/25 bg-cx-accent/10 text-cx-text"
            : "rounded-bl-sm border border-cx-border bg-cx-surface-2 text-cx-text-2"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap text-sm">{message.content || "…"}</div>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <p className="font-semibold text-cx-text mt-2 mb-1 text-sm">{children}</p>
                ),
                h2: ({ children }) => (
                  <p className="font-semibold text-cx-text mt-2 mb-1 text-sm">{children}</p>
                ),
                h3: ({ children }) => (
                  <p className="font-medium text-cx-text mt-1.5 mb-0.5 text-xs">{children}</p>
                ),
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0 text-xs leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-cx-text">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-cx-text-2">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="my-1.5 space-y-0.5 pl-3">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1.5 space-y-0.5 pl-4 list-decimal">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-xs text-cx-text-2 before:content-['•'] before:mr-1.5 before:text-cx-accent">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-cx-accent/40 pl-2.5 my-1.5 italic text-cx-text-3">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-cx-surface-3 px-1 py-0.5 font-mono text-[10px] text-cx-accent">
                    {children}
                  </code>
                ),
                // Render markdown tables as proper HTML tables
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto rounded-lg border border-cx-border">
                    <table className="w-full text-[10px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-cx-surface-3">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody>{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-cx-border/50 last:border-0">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-2.5 py-1.5 text-left font-semibold text-cx-text uppercase tracking-wider text-[9px]">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2.5 py-1.5 text-cx-text-2">{children}</td>
                ),
              }}
            >
              {message.content || "…"}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
