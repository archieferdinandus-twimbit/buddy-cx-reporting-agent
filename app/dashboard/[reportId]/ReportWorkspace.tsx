"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { RightPanel } from "@/components/canvas/RightPanel";
import type {
  Dataset,
  ReportSectionId,
  ReportSectionState,
  TaggedInsight,
  Message,
  CanvasCard,
  ReportStatus,
} from "@/types";
import { useAutoSave } from "@/hooks/useAutoSave";

const MIN_WIDTH = 240;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 380;
const STORAGE_KEY = "buddy-cx:chat-panel-width";

interface ReportWorkspaceProps {
  reportId: string;
  reportTitle: string;
  initialDataset: Dataset | null;
  initialSections: Record<ReportSectionId, ReportSectionState>;
  initialTaggedInsights: TaggedInsight[];
  initialChatHistory: Message[];
  initialCanvasCards: CanvasCard[];
  initialStatus: ReportStatus;
}

export function ReportWorkspace({
  reportId,
  reportTitle,
  initialDataset,
  initialSections,
  initialTaggedInsights,
  initialChatHistory,
  initialCanvasCards,
  initialStatus: _initialStatus,
}: ReportWorkspaceProps) {
  const store = useAppStore();

  // Hydrate store from saved report on mount
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;

      // Set current report context
      store.setCurrentReport(reportId, reportTitle);

      // Hydrate dataset
      if (initialDataset) {
        store.setCurrentDataset(initialDataset);
      }

      // Hydrate saved state if any
      if (Object.keys(initialSections).length > 0) {
        store.hydrateReport(
          initialSections,
          initialTaggedInsights,
          initialChatHistory,
          initialCanvasCards
        );
      }
    }

    // Clean up on unmount
    return () => {
      store.clearSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save hook
  useAutoSave(reportId);

  // ── Resizable panel ──────────────────────────────────────────
  const [chatWidth, setChatWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored);
      if (!isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) setChatWidth(n);
    }
  }, []);

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = chatWidth;
      setDragging(true);

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = e.clientX - startX.current;
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
        setChatWidth(next);
      };

      const onMouseUp = () => {
        isDragging.current = false;
        setDragging(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        setChatWidth((w) => {
          localStorage.setItem(STORAGE_KEY, String(w));
          return w;
        });
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [chatWidth]
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel: Chat */}
      <div
        className="relative flex-shrink-0 overflow-hidden border-r border-cx-border"
        style={{ width: chatWidth }}
      >
        <ChatPanel />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onDragHandleMouseDown}
        className="group relative z-20 -mx-[3px] w-[6px] flex-shrink-0 cursor-col-resize"
      >
        <div
          className={`absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full transition-all duration-150 ${
            dragging
              ? "bg-cx-accent opacity-100"
              : "bg-cx-border opacity-0 group-hover:opacity-100"
          }`}
        />
        <div
          className={`absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[3px] transition-opacity duration-150 ${
            dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 w-1 rounded-full transition-colors duration-150 ${
                dragging ? "bg-cx-accent" : "bg-cx-text-3"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right panel: Tabbed canvas (Analytics / Report) */}
      <RightPanel />
    </div>
  );
}
