export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: ToolResult[];
  createdAt: Date;
}

export interface ToolResult {
  toolName: string;
  result: unknown;
}

export interface Dataset {
  id: string;
  name: string;
  year: number;
  country: string;
  file_url: string | null;
  status: "pending" | "processing" | "complete" | "failed";
  company_count: number | null;
  uploaded_at: string;
}

export type ReportStatus = "new" | "in_progress" | "draft" | "complete";

export interface Report {
  id: string;
  dataset_id: string | null;
  title: string;
  status: ReportStatus;
  sections: Record<ReportSectionId, ReportSectionState>;
  tagged_insights: TaggedInsight[];
  chat_history: Message[];
  canvas_cards: CanvasCard[];
  created_at: string;
  updated_at: string;
  dataset?: Dataset;
}

export interface Company {
  id: string;
  dataset_id: string;
  company_name: string;
  industry: string;
  cx_star_rating: number | null;
  cx_star_mastery: string | null;
  digital_score: number | null;
  service_score: number | null;
  brand_score: number | null;
  employee_score: number | null;
  include_in_2025: boolean;
  raw_scores: Record<string, number> | null;
  created_at: string;
}

export interface QualitativeChunk {
  id: string;
  company_id: string;
  chunk_type: string;
  pillar: string | null;
  content: string;
  created_at: string;
}

// Report building types

export type ReportSectionId =
  | "executive_summary"
  | "digital_experience"
  | "service_experience"
  | "brand_experience"
  | "employee_experience"
  | "industry_spotlight"
  | "recommendations";

export interface CanvasCard {
  id: string;
  toolName: string;
  query: string;
  result: unknown;
  timestamp: Date;
}

export interface TaggedInsight {
  id: string;
  sectionId: ReportSectionId;
  type: "qualitative" | "data_table";
  companyName: string;
  industry: string;
  pillar: string | null;
  content: string;
  tableRows?: Record<string, unknown>[];
  tableLabel?: string;
  taggedAt: Date;
}

export interface ReportSectionState {
  html: string;
  status: "empty" | "draft" | "edited";
}

export interface PendingTableDescription {
  tableRows: Record<string, unknown>[];
  tableLabel?: string;
  sectionId: ReportSectionId;
}

export interface PendingAiContent {
  sectionId: ReportSectionId;
  html: string;
}

/** Table pending confirmation before insertion into the editor */
export interface PendingTableInsert {
  rows: Record<string, unknown>[];
  tableLabel?: string;
  html: string;
}
