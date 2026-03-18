"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/store";
import type { CanvasCard } from "@/types";

export function useAgentChat() {
  const {
    messages,
    addMessage,
    updateLastMessage,
    isLoading,
    setIsLoading,
    currentDataset,
    containerId,
    setContainerId,
    addCanvasCard,
  } = useAppStore();

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentDataset || isLoading) return;

      // Add user message
      const userMessage = {
        id: crypto.randomUUID(),
        role: "user" as const,
        content,
        createdAt: new Date(),
      };
      addMessage(userMessage);

      // Add placeholder assistant message
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content: "",
        createdAt: new Date(),
      };
      addMessage(assistantMessage);

      setIsLoading(true);
      abortRef.current = new AbortController();
      let accumulated = "";

      try {
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            datasetId: currentDataset.id,
            containerId,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Agent error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                updateLastMessage(accumulated);
              }
              if (parsed.toolResult) {
                const card: CanvasCard = {
                  id: parsed.toolResult.id || crypto.randomUUID(),
                  toolName: parsed.toolResult.toolName,
                  query: content,
                  result: parsed.toolResult.result,
                  timestamp: new Date(),
                };
                addCanvasCard(card);
              }
              if (parsed.error) {
                updateLastMessage(`Error: ${parsed.error}`);
              }
              if (parsed.containerId) {
                setContainerId(parsed.containerId);
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Agent chat error:", error);
          const errorMsg = error.message?.includes("Agent error:")
            ? `API error (${error.message}). Please try again.`
            : "An error occurred. Please try again.";
          updateLastMessage(accumulated || errorMsg);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, currentDataset, containerId, isLoading, addMessage, updateLastMessage, setIsLoading, setContainerId, addCanvasCard]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, sendMessage, stopGeneration, isLoading };
}
