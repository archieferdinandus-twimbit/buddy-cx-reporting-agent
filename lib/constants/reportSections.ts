import type { ReportSectionId } from "@/types";

export const REPORT_SECTIONS: readonly {
  id: ReportSectionId;
  label: string;
  description: string;
}[] = [
  {
    id: "executive_summary",
    label: "Executive Summary",
    description: "High-level overview of key findings and rankings",
  },
  {
    id: "digital_experience",
    label: "Digital Experience",
    description: "Analysis of digital channels, mobile apps, and online platforms",
  },
  {
    id: "service_experience",
    label: "Service Experience",
    description: "Customer service quality, responsiveness, and support channels",
  },
  {
    id: "brand_experience",
    label: "Brand Experience",
    description: "Brand perception, trust, and customer loyalty drivers",
  },
  {
    id: "employee_experience",
    label: "Employee Experience",
    description: "Employee engagement and its impact on customer outcomes",
  },
  {
    id: "industry_spotlight",
    label: "Industry Spotlight",
    description: "Deep-dive into standout industry trends and leaders",
  },
  {
    id: "recommendations",
    label: "Recommendations",
    description: "Strategic recommendations based on the analysis",
  },
] as const;

export const DEFAULT_REPORT_SECTIONS: Record<
  ReportSectionId,
  { html: string; status: "empty" | "draft" | "edited" }
> = {
  executive_summary: { html: "", status: "empty" },
  digital_experience: { html: "", status: "empty" },
  service_experience: { html: "", status: "empty" },
  brand_experience: { html: "", status: "empty" },
  employee_experience: { html: "", status: "empty" },
  industry_spotlight: { html: "", status: "empty" },
  recommendations: { html: "", status: "empty" },
};
