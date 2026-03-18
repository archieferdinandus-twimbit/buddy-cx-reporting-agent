import { create } from "zustand";
import type {
  Message,
  Dataset,
  CanvasCard,
  TaggedInsight,
  ReportSectionId,
  ReportSectionState,
  PendingTableDescription,
  PendingAiContent,
  PendingTableInsert,
} from "@/types";
import { DEFAULT_REPORT_SECTIONS } from "@/lib/constants/reportSections";

interface AppStore {
  // Current report context
  currentReportId: string | null;
  currentReportTitle: string | null;
  setCurrentReport: (id: string, title: string) => void;

  // Dataset
  currentDataset: Dataset | null;
  setCurrentDataset: (dataset: Dataset | null) => void;

  // Agent container (for Skills API multi-turn state)
  containerId: string | null;
  setContainerId: (id: string) => void;

  // Chat messages
  messages: Message[];
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isIngesting: boolean;
  setIsIngesting: (ingesting: boolean) => void;

  // Canvas cards (tool results displayed on the right panel)
  canvasCards: CanvasCard[];
  addCanvasCard: (card: CanvasCard) => void;
  clearCanvasCards: () => void;

  // Active right-panel tab
  activeTab: "analytics" | "report";
  setActiveTab: (tab: "analytics" | "report") => void;

  // Tagged insights (bridge between discovery and report)
  taggedInsights: TaggedInsight[];
  addTaggedInsight: (insight: TaggedInsight) => void;
  removeTaggedInsight: (id: string) => void;

  // Report sections
  reportSections: Record<ReportSectionId, ReportSectionState>;
  updateSectionContent: (sectionId: ReportSectionId, html: string) => void;
  appendToSectionContent: (sectionId: ReportSectionId, html: string) => void;
  setSectionStatus: (
    sectionId: ReportSectionId,
    status: ReportSectionState["status"]
  ) => void;

  // Active section in the report editor
  activeSectionId: ReportSectionId;
  setActiveSectionId: (id: ReportSectionId) => void;

  // Report drafting state
  isDrafting: boolean;
  setIsDrafting: (drafting: boolean) => void;

  // Pending table description (triggers AI describe bubble in Report tab)
  pendingTableDescription: PendingTableDescription | null;
  setPendingTableDescription: (pending: PendingTableDescription | null) => void;

  // Pending AI-generated content — shown as a diff preview before Accept/Discard
  pendingAiContent: PendingAiContent | null;
  setPendingAiContent: (content: PendingAiContent | null) => void;
  acceptAiContent: () => void;
  discardAiContent: () => void;

  // Pending table insert — floating confirm card in the editor
  pendingTableInsert: PendingTableInsert | null;
  setPendingTableInsert: (p: PendingTableInsert | null) => void;

  // Save state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  markDirty: () => void;

  // Hydrate from saved report
  hydrateReport: (
    sections: Record<ReportSectionId, ReportSectionState>,
    insights: TaggedInsight[],
    chatHistory: Message[],
    canvasCards: CanvasCard[]
  ) => void;

  // Save current state to API
  saveReport: () => Promise<void>;

  // Full session reset (used after dataset delete)
  clearSession: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // --- Current report ---
  currentReportId: null,
  currentReportTitle: null,
  setCurrentReport: (id, title) => set({ currentReportId: id, currentReportTitle: title }),

  // --- Dataset ---
  currentDataset: null,
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),

  containerId: null,
  setContainerId: (id) => set({ containerId: id }),

  // --- Messages ---
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message], isDirty: true })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),

  // --- UI state ---
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isIngesting: false,
  setIsIngesting: (ingesting) => set({ isIngesting: ingesting }),

  // --- Canvas cards ---
  canvasCards: [],
  addCanvasCard: (card) =>
    set((state) => ({ canvasCards: [...state.canvasCards, card], isDirty: true })),
  clearCanvasCards: () => set({ canvasCards: [] }),

  // --- Active tab ---
  activeTab: "analytics",
  setActiveTab: (tab) => set({ activeTab: tab }),

  // --- Tagged insights ---
  taggedInsights: [],
  addTaggedInsight: (insight) =>
    set((state) => ({
      taggedInsights: [...state.taggedInsights, insight],
      isDirty: true,
    })),
  removeTaggedInsight: (id) =>
    set((state) => ({
      taggedInsights: state.taggedInsights.filter((i) => i.id !== id),
      isDirty: true,
    })),

  // --- Report sections ---
  reportSections: { ...DEFAULT_REPORT_SECTIONS },
  updateSectionContent: (sectionId, html) =>
    set((state) => ({
      reportSections: {
        ...state.reportSections,
        [sectionId]: { ...state.reportSections[sectionId], html },
      },
      isDirty: true,
    })),
  appendToSectionContent: (sectionId, html) =>
    set((state) => {
      const existing = state.reportSections[sectionId];
      return {
        reportSections: {
          ...state.reportSections,
          [sectionId]: {
            html: existing.html ? existing.html + html : html,
            status: existing.status === "empty" ? "draft" : existing.status,
          },
        },
        isDirty: true,
      };
    }),
  setSectionStatus: (sectionId, status) =>
    set((state) => ({
      reportSections: {
        ...state.reportSections,
        [sectionId]: { ...state.reportSections[sectionId], status },
      },
      isDirty: true,
    })),

  // --- Active section ---
  activeSectionId: "executive_summary",
  setActiveSectionId: (id) => set({ activeSectionId: id }),

  // --- Drafting ---
  isDrafting: false,
  setIsDrafting: (drafting) => set({ isDrafting: drafting }),

  // --- Pending table description ---
  pendingTableDescription: null,
  setPendingTableDescription: (pending) =>
    set({ pendingTableDescription: pending }),

  // --- Pending AI content (Cursor-style diff) ---
  pendingAiContent: null,
  setPendingAiContent: (content) => set({ pendingAiContent: content }),
  acceptAiContent: () => {
    const { pendingAiContent, appendToSectionContent } = get();
    if (!pendingAiContent) return;
    appendToSectionContent(pendingAiContent.sectionId, pendingAiContent.html);
    set({ pendingAiContent: null });
  },
  discardAiContent: () => set({ pendingAiContent: null }),

  // --- Pending table insert ---
  pendingTableInsert: null,
  setPendingTableInsert: (p) => set({ pendingTableInsert: p }),

  // --- Save state ---
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  markDirty: () => set({ isDirty: true }),

  // --- Hydrate from saved report ---
  hydrateReport: (sections, insights, chatHistory, canvasCards) => {
    const mergedSections = { ...DEFAULT_REPORT_SECTIONS, ...sections };
    set({
      reportSections: mergedSections,
      taggedInsights: insights || [],
      messages: chatHistory || [],
      canvasCards: canvasCards || [],
      isDirty: false,
    });
  },

  // --- Save report to API ---
  saveReport: async () => {
    const state = get();
    if (!state.currentReportId) return;

    set({ isSaving: true });
    try {
      // Determine status based on content
      const hasDraftContent = Object.values(state.reportSections).some(
        (s) => s.status !== "empty"
      );
      const status = hasDraftContent ? "draft" : "in_progress";

      const res = await fetch(`/api/reports/${state.currentReportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          sections: state.reportSections,
          tagged_insights: state.taggedInsights,
          chat_history: state.messages,
          canvas_cards: state.canvasCards,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      set({ isDirty: false, isSaving: false, lastSavedAt: new Date() });
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  // --- Full session reset ---
  clearSession: () =>
    set({
      currentReportId: null,
      currentReportTitle: null,
      currentDataset: null,
      containerId: null,
      messages: [],
      isLoading: false,
      canvasCards: [],
      taggedInsights: [],
      activeTab: "analytics",
      activeSectionId: "executive_summary",
      reportSections: { ...DEFAULT_REPORT_SECTIONS },
      isDrafting: false,
      pendingTableDescription: null,
      pendingAiContent: null,
      pendingTableInsert: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
    }),
}));
