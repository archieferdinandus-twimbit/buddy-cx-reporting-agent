"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { useAppStore } from "@/store";
import { TableDescribeBubble } from "./TableDescribeBubble";
import { AiDiffPreview } from "./AiDiffPreview";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table, TableRow, TableHeader, TableCell, TableView } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { toast } from "sonner";

// ── Custom TableView — applies width/align attrs when resizable:true ──
class CustomTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.applyTableStyles();
  }

  applyTableStyles() {
    const node = (this as any).node as ProseMirrorNode | undefined;
    if (!node) return;
    const tbl = this.table as HTMLElement;
    const { tableWidth, tableAlign } = node.attrs;

    tbl.style.width = tableWidth || "100%";

    switch (tableAlign) {
      case "center":
        tbl.style.marginLeft = "auto";
        tbl.style.marginRight = "auto";
        break;
      case "right":
        tbl.style.marginLeft = "auto";
        tbl.style.marginRight = "0";
        break;
      default: // left
        tbl.style.marginLeft = "0";
        tbl.style.marginRight = "auto";
    }
  }

  update(node: ProseMirrorNode): boolean {
    const result = super.update(node as any);
    if (result) this.applyTableStyles();
    return result;
  }
}

// ── CustomTable extension — adds tableWidth + tableAlign attributes ──
const CustomTable = Table.configure({ resizable: true }).extend({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addOptions(): any {
    return {
      ...this.parent?.(),
      View: CustomTableView,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      tableWidth: {
        default: "100%",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-table-width") || "100%",
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.tableWidth || attrs.tableWidth === "100%") return {};
          return { "data-table-width": attrs.tableWidth };
        },
      },
      tableAlign: {
        default: "left",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-table-align") || "left",
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.tableAlign || attrs.tableAlign === "left") return {};
          return { "data-table-align": attrs.tableAlign };
        },
      },
    };
  },
});

// ── Custom command type augmentation ──────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

// ── Font size presets ──────────────────────────────────────────
const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];
const DEFAULT_FONT_SIZE = 14;

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize || null,
            renderHTML: (attrs: Record<string, unknown>) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: () => any }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: () => any }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

// ── Line height presets ────────────────────────────────────────
const LINE_HEIGHTS = [1.0, 1.2, 1.4, 1.6, 1.7, 2.0, 2.4];
const DEFAULT_LINE_HEIGHT = 1.7;

const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (attrs: Record<string, unknown>) => {
              if (!attrs.lineHeight) return {};
              return { style: `line-height: ${attrs.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lh: string) =>
        ({ commands }: { commands: any }) => {
          return ["paragraph", "heading"].every((type) =>
            commands.updateAttributes(type, { lineHeight: lh })
          );
        },
    };
  },
});

// ── AI quick actions ───────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "proofread",
    label: "Proofread",
    icon: "✓",
    instruction:
      "Proofread this text: fix grammar, spelling, and punctuation while keeping the original meaning and tone.",
  },
  {
    id: "rewrite",
    label: "Rewrite",
    icon: "↺",
    instruction:
      "Rewrite this text to be clearer, more professional, and more impactful while preserving the key information.",
  },
  {
    id: "shorter",
    label: "Shorter",
    icon: "↕",
    instruction:
      "Make this text more concise — remove unnecessary words while keeping all key information.",
  },
  {
    id: "longer",
    label: "Longer",
    icon: "↗",
    instruction:
      "Expand this text with more detail, context, and supporting points while maintaining a professional tone.",
  },
];

// ── Types ──────────────────────────────────────────────────────
interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  editable?: boolean;
}

interface DiffPreview {
  from: number;
  to: number;
  originalText: string;
  rewrittenText: string;
  anchorTop: number;
  anchorLeft: number;
}

// ── Helpers ────────────────────────────────────────────────────
function nearestIdx(arr: number[], val: number) {
  return arr.reduce(
    (best, cur, i) =>
      Math.abs(cur - val) < Math.abs(arr[best] - val) ? i : best,
    0
  );
}

// ── Component ──────────────────────────────────────────────────
export function TiptapEditor({
  content,
  onUpdate,
  editable = true,
}: TiptapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bubble menu state
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 0 });
  const [bubbleMode, setBubbleMode] = useState<"menu" | "custom">("menu");
  // Keep a ref so the blur handler can read the latest mode without re-subscribing
  const bubbleModeRef = useRef<"menu" | "custom">("menu");
  useEffect(() => { bubbleModeRef.current = bubbleMode; }, [bubbleMode]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);

  // Diff preview panel
  const [diffPreview, setDiffPreview] = useState<DiffPreview | null>(null);

  // Store state
  const {
    pendingTableInsert,
    setPendingTableInsert,
    setPendingTableDescription,
    activeSectionId,
    pendingTableDescription,
    pendingAiContent,
  } = useAppStore();

  // Floating panel anchor — computed from the target table's bounding rect
  const [tableAnchor, setTableAnchor] = useState<{ top: number; right: number } | null>(null);

  // Scroll container ref — used to position the AI panel in document flow
  const scrollRef = useRef<HTMLDivElement>(null);
  // Absolute position of the AI panel inside the scroll container
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  // Table edge drag-to-resize
  const [tableBounds, setTableBounds] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null);
  const [isDraggingEdge, setIsDraggingEdge] = useState(false);
  const edgeDragRef = useRef<{
    edge: "left" | "right";
    startX: number;
    startWidthPct: number;
    containerWidth: number;
  } | null>(null);

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(editor.getHTML());
      }, 300);
    },
    [onUpdate]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder:
          "Start writing or generate a draft from your tagged insights...",
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
      TextStyle,
      FontSize,
      LineHeight,
      CustomTable,
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none min-h-[400px] px-8 py-6",
      },
    },
  });

  // Sync content when switching sections
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  // Track bubble position from selection
  useEffect(() => {
    if (!editor) return;

    const updateBubble = () => {
      if (diffPreview) { setBubbleVisible(false); return; }
      const { selection } = editor.state;
      if (selection.empty) { setBubbleVisible(false); return; }
      try {
        const { from, to } = selection;
        const startCoords = editor.view.coordsAtPos(from);
        const endCoords = editor.view.coordsAtPos(to);
        const centreX = (startCoords.left + endCoords.right) / 2;
        setBubblePos({ top: startCoords.top - 44, left: centreX });
        setBubbleVisible(true);
      } catch {
        setBubbleVisible(false);
      }
    };

    editor.on("selectionUpdate", updateBubble);
    // Only dismiss on blur when NOT in the custom Ask-AI input mode —
    // autoFocus on the input would otherwise kill the bubble immediately.
    editor.on("blur", () => setTimeout(() => {
      if (bubbleModeRef.current !== "custom") setBubbleVisible(false);
    }, 150));

    return () => { editor.off("selectionUpdate", updateBubble); };
  }, [editor, diffPreview]);

  // AI rewrite
  const handleRewrite = async (instruction: string) => {
    if (!editor || isRewriting) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText.trim()) return;

    let anchorTop = 200;
    let anchorLeft = window.innerWidth / 2;
    try {
      const coords = editor.view.coordsAtPos(from);
      anchorTop = coords.bottom + 8;
      anchorLeft = coords.left;
    } catch { /* ignore */ }

    setIsRewriting(true);
    setBubbleVisible(false);

    try {
      const res = await fetch("/api/report/rewrite-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText, instruction }),
      });
      if (!res.ok) throw new Error("Rewrite failed");
      const { rewrittenText } = await res.json();
      if (rewrittenText) {
        setDiffPreview({ from, to, originalText: selectedText, rewrittenText, anchorTop, anchorLeft });
      }
    } catch {
      toast.error("Rewrite failed — please try again.");
    } finally {
      setIsRewriting(false);
      setCustomPrompt("");
      setBubbleMode("menu");
    }
  };

  const handleAccept = () => {
    if (!editor || !diffPreview) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: diffPreview.from, to: diffPreview.to })
      .deleteSelection()
      .insertContent(diffPreview.rewrittenText)
      .run();
    setDiffPreview(null);
  };

  const handleReject = () => setDiffPreview(null);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // ── Table-anchored floating panels ────────────────────────────
  // When either the describe bubble or AI diff preview is active,
  // highlight the most-recently inserted table and compute its position.
  useEffect(() => {
    if (!editor) return;

    const isActive =
      (pendingTableDescription && pendingTableDescription.sectionId === activeSectionId) ||
      (pendingAiContent && pendingAiContent.sectionId === activeSectionId);

    const tables = editor.view.dom.querySelectorAll("table");
    const target = tables.length > 0 ? (tables[tables.length - 1] as HTMLElement) : null;

    if (!isActive || !target) {
      setTableAnchor(null);
      target?.removeAttribute("data-ai-pending");
      return;
    }

    target.setAttribute("data-ai-pending", "true");
    const rect = target.getBoundingClientRect();
    setTableAnchor({ top: rect.top, right: rect.right });

    // Push content below the table down to make room for the inline panel
    const wrapper = (target.closest(".tableWrapper") ?? target) as HTMLElement;
    wrapper.style.marginBottom = "340px";

    return () => {
      target.removeAttribute("data-ai-pending");
      wrapper.style.marginBottom = "";
    };
  }, [editor, pendingTableDescription, pendingAiContent, activeSectionId]);

  // Track the bounding rect of the table the cursor is currently inside
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      if (!editor.isActive("table")) { setTableBounds(null); return; }
      try {
        const { from } = editor.state.selection;
        const domInfo = editor.view.domAtPos(from);
        let el = domInfo.node as HTMLElement | null;
        while (el && el.tagName !== "TABLE") el = el.parentElement;
        if (el?.tagName === "TABLE") {
          const r = el.getBoundingClientRect();
          setTableBounds({ top: r.top, left: r.left, right: r.right, bottom: r.bottom });
        }
      } catch { /* ignore */ }
    };
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    return () => { editor.off("selectionUpdate", update); editor.off("update", update); };
  }, [editor]);

  // Compute panel position (absolute inside scroll container) whenever the anchor or table bounds change
  useEffect(() => {
    if (!tableAnchor || !scrollRef.current) { setPanelPos(null); return; }
    const c = scrollRef.current;
    const cr = c.getBoundingClientRect();
    const PANEL_W = 420;

    // Convert viewport-relative bottom to absolute offset from scroll-container top
    const tableBottom = tableBounds ? tableBounds.bottom : tableAnchor.top + 40;
    const tableLeft   = tableBounds ? tableBounds.left   : cr.left;
    const tableRight  = tableBounds ? tableBounds.right  : cr.right;

    const top  = (tableBottom - cr.top) + c.scrollTop + 16;
    const center = (tableLeft + tableRight) / 2;
    const left = Math.max(16, Math.min(c.clientWidth - PANEL_W - 16, center - cr.left - PANEL_W / 2));

    setPanelPos({ top, left });
  }, [tableAnchor, tableBounds]);

  // Edge drag: handle mousemove/mouseup globally while dragging
  useEffect(() => {
    if (!isDraggingEdge || !edgeDragRef.current || !editor) return;
    const drag = edgeDragRef.current;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - drag.startX;
      const deltaPct = (deltaX / drag.containerWidth) * 100;
      const newPct = Math.round(Math.min(100, Math.max(20,
        drag.edge === "right" ? drag.startWidthPct + deltaPct : drag.startWidthPct - deltaPct
      )));
      const { state } = editor;
      const { $from } = state.selection;
      for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type.name === "table") {
          const pos = $from.before(d);
          editor.view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, tableWidth: `${newPct}%` }));
          break;
        }
      }
    };
    const handleMouseUp = () => { setIsDraggingEdge(false); edgeDragRef.current = null; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [isDraggingEdge, editor]);

  if (!editor) return null;

  // ── Derived state for toolbar labels ──────────────────────────
  const fontSizeRaw = editor.getAttributes("textStyle").fontSize as string | null;
  const currentFontSize = fontSizeRaw ? parseInt(fontSizeRaw) : DEFAULT_FONT_SIZE;

  const lineHeightRaw = editor.getAttributes("paragraph").lineHeight as string | null;
  const currentLineHeight = lineHeightRaw ? parseFloat(lineHeightRaw) : DEFAULT_LINE_HEIGHT;

  const handleFontSize = (dir: "up" | "down") => {
    const idx = nearestIdx(FONT_SIZES, currentFontSize);
    const newIdx = dir === "up"
      ? Math.min(idx + 1, FONT_SIZES.length - 1)
      : Math.max(idx - 1, 0);
    editor.chain().focus().setFontSize(`${FONT_SIZES[newIdx]}px`).run();
  };

  const handleLineHeight = (dir: "up" | "down") => {
    const idx = nearestIdx(LINE_HEIGHTS, currentLineHeight);
    const newIdx = dir === "up"
      ? Math.min(idx + 1, LINE_HEIGHTS.length - 1)
      : Math.max(idx - 1, 0);
    editor.chain().focus().setLineHeight(`${LINE_HEIGHTS[newIdx]}`).run();
  };

  const inTable = editor.isActive("table");

  // Read attributes from the ancestor table node at the cursor
  const currentTableAttrs = (() => {
    if (!inTable) return { tableWidth: "100%", tableAlign: "left" };
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "table") return node.attrs as { tableWidth: string; tableAlign: string };
    }
    return { tableWidth: "100%", tableAlign: "left" };
  })();

  // Dispatch a transaction to update attrs on the ancestor table node
  const setTableAttr = (key: string, value: string) => {
    const { state } = editor;
    const { $from } = state.selection;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "table") {
        const pos = $from.before(depth);
        editor.view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, [key]: value })
        );
        return;
      }
    }
  };

  // Start edge drag — capture initial metrics
  const handleEdgeDragStart = (edge: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tableBounds) return;
    // Use the editor scroll container width as the reference for percentage
    const container = editor.view.dom.closest(".overflow-y-auto") as HTMLElement | null
      ?? editor.view.dom.parentElement;
    const containerWidth = container?.getBoundingClientRect().width ?? window.innerWidth;
    const currentWidthPct = ((tableBounds.right - tableBounds.left) / containerWidth) * 100;
    edgeDragRef.current = { edge, startX: e.clientX, startWidthPct: currentWidthPct, containerWidth };
    setIsDraggingEdge(true);
  };

  // Extract table rows from the DOM at the current cursor position
  const extractCurrentTableRows = (): Record<string, unknown>[] | null => {
    if (!editor) return null;
    const { from } = editor.state.selection;
    let el: HTMLElement | null = null;
    try {
      const domInfo = editor.view.domAtPos(from);
      el = domInfo.node as HTMLElement;
    } catch {
      return null;
    }
    // Walk up to the <table> element
    while (el && el.tagName !== "TABLE") {
      el = el.parentElement;
    }
    if (!el || el.tagName !== "TABLE") return null;

    // Collect header labels
    const headers: string[] = [];
    el.querySelectorAll("thead tr th, thead tr td").forEach((cell) =>
      headers.push(cell.textContent?.trim() || "")
    );
    // Fall back to first-row cells if no <thead>
    if (headers.length === 0) {
      el.querySelectorAll("tr:first-child th, tr:first-child td").forEach((cell) =>
        headers.push(cell.textContent?.trim() || "")
      );
    }

    // Parse body rows
    const rows: Record<string, unknown>[] = [];
    const bodySelector = headers.length > 0 ? "tbody tr" : "tr:not(:first-child)";
    el.querySelectorAll(bodySelector).forEach((tr) => {
      const cells = tr.querySelectorAll("td, th");
      if (cells.length === 0) return;
      const row: Record<string, unknown> = {};
      cells.forEach((cell, i) => {
        const key = headers[i] ?? `col_${i + 1}`;
        row[key] = cell.textContent?.trim() ?? "";
      });
      rows.push(row);
    });

    return rows.length > 0 ? rows : null;
  };

  const handleDescribeCurrentTable = () => {
    const rows = extractCurrentTableRows();
    setPendingTableDescription({
      tableRows: rows ?? [],
      tableLabel: undefined,
      sectionId: activeSectionId,
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="border-b border-cx-border bg-cx-surface">

        {/* Row 1: Text formatting */}
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5">

          {/* Headings */}
          <Tooltip label="Heading 2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="">H2</ToolbarButton>
          </Tooltip>
          <Tooltip label="Heading 3">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="">H3</ToolbarButton>
          </Tooltip>

          <Sep />

          {/* Inline marks */}
          <Tooltip label="Bold (Ctrl+B)">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="">
              <span className="font-bold">B</span>
            </ToolbarButton>
          </Tooltip>
          <Tooltip label="Italic (Ctrl+I)">
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="">
              <span className="italic">I</span>
            </ToolbarButton>
          </Tooltip>
          <Tooltip label="Underline (Ctrl+U)">
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="">
              <span className="underline">U</span>
            </ToolbarButton>
          </Tooltip>

          <Sep />

          {/* Font size */}
          <Tooltip label="Decrease font size">
            <ToolbarButton onClick={() => handleFontSize("down")} active={false} title="">
              <span className="text-[10px]">A<sup>−</sup></span>
            </ToolbarButton>
          </Tooltip>
          <input
            key={`fs-${currentFontSize}`}
            type="number"
            defaultValue={currentFontSize}
            min={8}
            max={72}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 8 && val <= 72) {
                editor.chain().focus().setFontSize(`${val}px`).run();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape")
                (e.target as HTMLInputElement).blur();
            }}
            title="Font size"
            className="w-9 rounded border border-transparent bg-transparent px-0.5 text-center text-[10px] text-cx-text-2 tabular-nums [appearance:textfield] hover:border-cx-border focus:border-cx-border focus:bg-cx-surface-3 focus:outline-none"
          />
          <Tooltip label="Increase font size">
            <ToolbarButton onClick={() => handleFontSize("up")} active={false} title="">
              <span className="text-[10px]">A<sup>+</sup></span>
            </ToolbarButton>
          </Tooltip>

          <Sep />

          {/* Text alignment */}
          <Tooltip label="Align left">
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="">
              <AlignLeftIcon />
            </ToolbarButton>
          </Tooltip>
          <Tooltip label="Align center">
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="">
              <AlignCenterIcon />
            </ToolbarButton>
          </Tooltip>
          <Tooltip label="Align right">
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="">
              <AlignRightIcon />
            </ToolbarButton>
          </Tooltip>

          <Sep />

          {/* Line spacing */}
          <Tooltip label="Decrease line spacing">
            <ToolbarButton onClick={() => handleLineHeight("down")} active={false} title="">
              <LineSpacingDecreaseIcon />
            </ToolbarButton>
          </Tooltip>
          <input
            key={`lh-${currentLineHeight}`}
            type="number"
            defaultValue={currentLineHeight.toFixed(1)}
            min={0.8}
            max={3.0}
            step={0.1}
            onBlur={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0.8 && val <= 3.0) {
                editor.chain().focus().setLineHeight(`${val}`).run();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape")
                (e.target as HTMLInputElement).blur();
            }}
            title="Line spacing"
            className="w-10 rounded border border-transparent bg-transparent px-0.5 text-center text-[10px] text-cx-text-2 tabular-nums [appearance:textfield] hover:border-cx-border focus:border-cx-border focus:bg-cx-surface-3 focus:outline-none"
          />
          <Tooltip label="Increase line spacing">
            <ToolbarButton onClick={() => handleLineHeight("up")} active={false} title="">
              <LineSpacingIncreaseIcon />
            </ToolbarButton>
          </Tooltip>
        </div>

        {/* Row 2: Table controls (context-sensitive) */}
        {inTable && (
          <div className="flex items-center gap-0.5 border-t border-cx-border/60 bg-cx-surface-2/60 px-3 py-1">
            <span className="mr-1.5 text-[9px] font-semibold uppercase tracking-widest text-cx-text-3">Table</span>

            {/* Columns */}
            <Tooltip label="Insert column before">
              <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} active={false} title="">
                <ColAddBeforeIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Insert column after">
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} active={false} title="">
                <ColAddAfterIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Delete column">
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} active={false} title="">
                <ColDeleteIcon />
              </ToolbarButton>
            </Tooltip>

            <Sep />

            {/* Rows */}
            <Tooltip label="Insert row above">
              <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} active={false} title="">
                <RowAddBeforeIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Insert row below">
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} active={false} title="">
                <RowAddAfterIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Delete row">
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} active={false} title="">
                <RowDeleteIcon />
              </ToolbarButton>
            </Tooltip>

            <Sep />

            {/* Copy / Cut table */}
            <Tooltip label="Copy table">
              <ToolbarButton active={false} title="" onClick={() => {
                const { from } = editor.state.selection;
                const domInfo = editor.view.domAtPos(from);
                let el = domInfo.node as HTMLElement;
                while (el && el.tagName !== "TABLE") el = el.parentElement!;
                if (el?.tagName === "TABLE") {
                  navigator.clipboard.writeText(el.outerHTML).then(() => toast.success("Table copied")).catch(() => toast.error("Copy failed"));
                }
              }}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Cut table">
              <ToolbarButton active={false} title="" onClick={() => {
                const { from } = editor.state.selection;
                const domInfo = editor.view.domAtPos(from);
                let el = domInfo.node as HTMLElement;
                while (el && el.tagName !== "TABLE") el = el.parentElement!;
                if (el?.tagName === "TABLE") {
                  navigator.clipboard.writeText(el.outerHTML).then(() => {
                    editor.chain().focus().deleteTable().run();
                    toast.success("Table cut");
                  }).catch(() => toast.error("Cut failed"));
                }
              }}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              </ToolbarButton>
            </Tooltip>

            <Sep />

            {/* Delete table */}
            <Tooltip label="Delete table">
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteTable().run()}
                active={false}
                title=""
                danger
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </ToolbarButton>
            </Tooltip>

            <Sep />

            {/* Table alignment */}
            <span className="ml-1 text-[9px] font-semibold uppercase tracking-widest text-cx-text-3">Align</span>
            <Tooltip label="Align table left">
              <ToolbarButton onClick={() => setTableAttr("tableAlign", "left")} active={currentTableAttrs.tableAlign === "left"} title="">
                <TableAlignLeftIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Align table center">
              <ToolbarButton onClick={() => setTableAttr("tableAlign", "center")} active={currentTableAttrs.tableAlign === "center"} title="">
                <TableAlignCenterIcon />
              </ToolbarButton>
            </Tooltip>
            <Tooltip label="Align table right">
              <ToolbarButton onClick={() => setTableAttr("tableAlign", "right")} active={currentTableAttrs.tableAlign === "right"} title="">
                <TableAlignRightIcon />
              </ToolbarButton>
            </Tooltip>

            <Sep />

            {/* Width presets (drag handles on table edges for freeform resize) */}
            <span className="ml-1 text-[9px] font-semibold uppercase tracking-widest text-cx-text-3">Width</span>
            {([50, 75, 100] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTableAttr("tableWidth", `${w}%`)}
                className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                  parseInt(currentTableAttrs.tableWidth) === w
                    ? "bg-cx-accent/15 text-cx-accent"
                    : "text-cx-text-3 hover:bg-cx-surface-3 hover:text-cx-text-2"
                }`}
              >
                {w}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Editor (scroll container — relative so absolute children work) ── */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto bg-cx-bg">
        <EditorContent editor={editor} />

        {/* ── Table-anchored AI panel — inline in document flow ── */}
        {tableAnchor && editable && panelPos && (
          <div
            className="animate-fade-in"
            style={{ position: "absolute", top: panelPos.top, left: panelPos.left, width: 420, zIndex: 50 }}
          >
            {pendingTableDescription && pendingTableDescription.sectionId === activeSectionId && (
              <TableDescribeBubble pending={pendingTableDescription} />
            )}
            {pendingAiContent && pendingAiContent.sectionId === activeSectionId && (
              <AiDiffPreview pending={pendingAiContent} />
            )}
          </div>
        )}
      </div>

      {/* ── Table edge drag handles ───────────────────────────── */}
      {tableBounds && inTable && editable && (
        <>
          {(["left", "right"] as const).map((edge) => {
            const x = edge === "left" ? tableBounds.left : tableBounds.right;
            const height = tableBounds.bottom - tableBounds.top;
            return (
              <div
                key={edge}
                onMouseDown={(e) => handleEdgeDragStart(edge, e)}
                style={{
                  position: "fixed",
                  top: tableBounds.top,
                  left: x - 6,
                  width: 12,
                  height,
                  zIndex: 9001,
                  cursor: isDraggingEdge ? "col-resize" : undefined,
                }}
                className="group/edge cursor-col-resize"
              >
                {/* Visible handle line */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-cx-accent/0 transition-colors group-hover/edge:bg-cx-accent/60 group-active/edge:bg-cx-accent" />
                {/* Arrow indicator on hover */}
                <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center opacity-0 transition-opacity group-hover/edge:opacity-100">
                  <div className="rounded-full border border-cx-accent/40 bg-cx-surface-2 px-0.5 py-1 text-[8px] leading-none text-cx-accent shadow-md">
                    {edge === "left" ? "◀▶" : "◀▶"}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Pending table insert — floating confirmation card ── */}
      {pendingTableInsert && editable && (
        <div className="pointer-events-auto animate-fade-in fixed bottom-6 right-6 z-[9998] w-96 overflow-hidden rounded-2xl border border-cx-accent/30 bg-cx-surface-2 shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cx-border px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-cx-text">Insert Table</span>
            </div>
            <button
              onClick={() => setPendingTableInsert(null)}
              className="rounded p-0.5 text-cx-text-3 hover:bg-cx-surface-3 hover:text-cx-text"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Label */}
          {pendingTableInsert.tableLabel && (
            <div className="border-b border-cx-border/50 px-4 py-2">
              <p className="text-[10px] text-cx-text-3">
                <span className="text-cx-text-2">Table: </span>{pendingTableInsert.tableLabel}
              </p>
            </div>
          )}

          {/* Mini preview of the table */}
          <div
            className="tiptap-editor max-h-48 overflow-auto px-4 py-3 text-[11px]"
            dangerouslySetInnerHTML={{ __html: pendingTableInsert.html }}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-cx-border bg-cx-surface px-4 py-3">
            <p className="flex-1 text-[10px] text-cx-text-3">
              Table will be placed at your cursor position
            </p>
            <button
              onClick={() => setPendingTableInsert(null)}
              className="rounded-md border border-cx-border px-3 py-1.5 text-[10px] font-medium text-cx-text-2 hover:bg-cx-surface-3"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!editor) return;
                editor.chain().focus().insertContent(pendingTableInsert.html).run();
                // Trigger the AI describe bubble now that the table is in the editor
                setPendingTableDescription({
                  tableRows: pendingTableInsert.rows,
                  tableLabel: pendingTableInsert.tableLabel,
                  sectionId: activeSectionId,
                });
                setPendingTableInsert(null);
                toast.success("Table inserted — ask AI to describe the data");
              }}
              className="rounded-md bg-cx-accent px-3 py-1.5 text-[10px] font-semibold text-cx-bg hover:bg-cx-accent/80"
            >
              Insert Here ↵
            </button>
          </div>
        </div>
      )}

      {/* ── Bubble menu ── */}
      {bubbleVisible && editable && !isRewriting && !diffPreview && (
        <div
          className="pointer-events-auto animate-fade-in"
          style={{ position: "fixed", top: Math.max(8, bubblePos.top), left: bubblePos.left, transform: "translateX(-50%)", zIndex: 9999 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="overflow-hidden rounded-xl border border-cx-border bg-cx-surface-2 shadow-2xl shadow-black/60">
            {bubbleMode === "menu" ? (
              <div className="flex items-center divide-x divide-cx-border">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleRewrite(action.instruction)}
                    className="flex items-center gap-1 px-3 py-2 text-[10px] font-medium text-cx-text-2 transition-colors hover:bg-cx-surface-3 hover:text-cx-text"
                  >
                    <span className="text-cx-accent">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
                {inTable ? (
                  // Inside a table: "Ask AI" triggers the describe panel
                  <button
                    onClick={() => {
                      setBubbleVisible(false);
                      handleDescribeCurrentTable();
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-[10px] font-medium text-cx-accent transition-colors hover:bg-cx-surface-3"
                  >
                    <svg className="h-3 w-3 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Describe Table
                  </button>
                ) : (
                  // Outside a table: custom freeform AI instruction
                  <button
                    onClick={() => setBubbleMode("custom")}
                    className="flex items-center gap-1 px-3 py-2 text-[10px] font-medium text-cx-text-2 transition-colors hover:bg-cx-surface-3 hover:text-cx-text"
                  >
                    <svg className="h-3 w-3 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Ask AI
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <svg className="h-3 w-3 flex-shrink-0 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customPrompt.trim()) {
                      handleRewrite(customPrompt.trim());
                      setBubbleVisible(false);
                    }
                    if (e.key === "Escape") { setBubbleMode("menu"); setBubbleVisible(false); }
                  }}
                  onBlur={() => setTimeout(() => { setBubbleMode("menu"); setBubbleVisible(false); }, 200)}
                  placeholder="Tell AI what to do…"
                  className="w-52 bg-transparent text-[11px] text-cx-text placeholder:text-cx-text-3 focus:outline-none"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (customPrompt.trim()) {
                      handleRewrite(customPrompt.trim());
                      setBubbleVisible(false);
                    }
                  }}
                  disabled={!customPrompt.trim()}
                  className="flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-cx-accent hover:bg-cx-accent/10 disabled:opacity-30"
                >
                  Go
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Rewriting spinner ── */}
      {isRewriting && (
        <div
          className="pointer-events-none animate-fade-in"
          style={{ position: "fixed", top: Math.max(8, bubblePos.top), left: bubblePos.left, transform: "translateX(-50%)", zIndex: 9999 }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-cx-border bg-cx-surface-2 px-4 py-2.5 shadow-xl">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-cx-accent animate-dot-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
            <span className="text-[10px] text-cx-text-3">Rewriting…</span>
          </div>
        </div>
      )}

      {/* ── Diff preview panel ── */}
      {diffPreview && (() => {
        const PANEL_W = 520;
        const PANEL_H = 420;
        const left = Math.max(16, Math.min(diffPreview.anchorLeft, window.innerWidth  - PANEL_W - 16));
        const top  = Math.max(16, Math.min(diffPreview.anchorTop,  window.innerHeight - PANEL_H - 16));
        return (
          <div
            className="animate-fade-in"
            style={{ position: "fixed", top, left, width: PANEL_W, zIndex: 9999 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="overflow-hidden rounded-xl border border-cx-border bg-cx-surface-2 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between border-b border-cx-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 text-cx-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cx-accent">AI Suggestion</span>
                </div>
                <button onClick={handleReject} className="rounded p-0.5 text-cx-text-3 hover:text-cx-text-2">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="border-b border-cx-border bg-cx-red/5 px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-cx-red" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-cx-red/70">Before</span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-xs leading-relaxed text-cx-red/80 line-through decoration-cx-red/40">{diffPreview.originalText}</p>
                </div>
              </div>
              <div className="border-b border-cx-border bg-cx-green/5 px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-cx-green" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-cx-green/70">After</span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-xs leading-relaxed text-cx-green/90">{diffPreview.rewrittenText}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-3 py-2">
                <button onClick={handleReject} className="flex items-center gap-1 rounded-md border border-cx-border px-2.5 py-1.5 text-[10px] font-medium text-cx-text-3 transition-colors hover:border-cx-red/30 hover:text-cx-red">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Reject
                </button>
                <button onClick={handleAccept} className="flex items-center gap-1 rounded-md border border-cx-green/30 bg-cx-green/10 px-2.5 py-1.5 text-[10px] font-medium text-cx-green transition-colors hover:bg-cx-green/20">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Accept
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Shared toolbar primitives ──────────────────────────────────

function Sep() {
  return <div className="mx-1 h-4 w-px bg-cx-border" />;
}

/** Styled tooltip wrapper — shows on hover above the child element */
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/tip relative inline-flex">
      {children}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 z-[10000] mb-2 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        <div className="whitespace-nowrap rounded-md border border-cx-border bg-cx-surface-3 px-2.5 py-1 text-[10px] font-medium text-cx-text shadow-xl">
          {label}
        </div>
        {/* Caret */}
        <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-cx-surface-3" />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs transition-colors ${
        danger
          ? "text-cx-text-3 hover:bg-cx-red/10 hover:text-cx-red"
          : active
          ? "bg-cx-accent/15 text-cx-accent"
          : "text-cx-text-3 hover:bg-cx-surface-2 hover:text-cx-text-2"
      }`}
    >
      {children}
    </button>
  );
}

// ── SVG icon components ────────────────────────────────────────

function AlignLeftIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h14M4 18h8" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 10h10M5 14h14M8 18h8" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 10h10M6 14h14M12 18h8" />
    </svg>
  );
}

/** Compress: two rows with arrows pointing inward toward each other */
function LineSpacingDecreaseIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Top text line */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h10" />
      {/* Bottom text line */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 18h10" />
      {/* Arrow pointing down from top */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9v6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l2 2 2-2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 11l2-2 2 2" />
    </svg>
  );
}

/** Expand: two rows with arrows pointing outward away from each other */
function LineSpacingIncreaseIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Top text line */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h10" />
      {/* Bottom text line */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h10" />
      {/* Arrow pointing up from center */}
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15V9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 11l2-2 2 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l2 2 2-2" />
    </svg>
  );
}

// Table icon helpers
function ColAddBeforeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="13" y="3" width="8" height="18" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v8M4 12h6" />
    </svg>
  );
}

function ColAddAfterIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="8" height="18" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8v8M14 12h6" />
    </svg>
  );
}

function ColDeleteIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="8" height="18" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 10l4 4m0-4l-4 4" />
    </svg>
  );
}

function RowAddBeforeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="13" width="18" height="8" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M12 4v6" />
    </svg>
  );
}

function RowAddAfterIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="18" height="8" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M12 14v6" />
    </svg>
  );
}

function RowDeleteIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="18" height="8" rx="1" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 16l4 4m0-4l-4 4" />
    </svg>
  );
}

// Table alignment icons — table silhouette + alignment indicator
function TableAlignLeftIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Table block left-aligned */}
      <rect x="2" y="5" width="13" height="14" rx="1" strokeWidth={1.8} />
      {/* Right margin lines */}
      <path strokeLinecap="round" strokeWidth={1.5} d="M18 8h4M18 12h4M18 16h4" strokeDasharray="2 1" />
    </svg>
  );
}

function TableAlignCenterIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Table block centered */}
      <rect x="5.5" y="5" width="13" height="14" rx="1" strokeWidth={1.8} />
      {/* Left + right equal margin lines */}
      <path strokeLinecap="round" strokeWidth={1.5} d="M2 8h2M2 12h2M2 16h2" strokeDasharray="2 1" />
      <path strokeLinecap="round" strokeWidth={1.5} d="M20 8h2M20 12h2M20 16h2" strokeDasharray="2 1" />
    </svg>
  );
}

function TableAlignRightIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {/* Table block right-aligned */}
      <rect x="9" y="5" width="13" height="14" rx="1" strokeWidth={1.8} />
      {/* Left margin lines */}
      <path strokeLinecap="round" strokeWidth={1.5} d="M2 8h4M2 12h4M2 16h4" strokeDasharray="2 1" />
    </svg>
  );
}
