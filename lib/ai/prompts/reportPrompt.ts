import type { ReportSectionId, TaggedInsight } from "@/types";
import { REPORT_SECTIONS } from "@/lib/constants/reportSections";

const SECTION_GUIDANCE: Record<ReportSectionId, string> = {
  executive_summary: `Write a high-level executive summary. Highlight the top 3-5 key findings, mention standout companies, and summarize the overall CX landscape. Keep it broad and strategic — avoid deep-diving into individual pillars.`,
  digital_experience: `Analyze digital experience trends. Cite specific companies and their digital scores. Highlight best practices in mobile apps, web platforms, and digital innovation. Compare leaders vs. laggards.`,
  service_experience: `Analyze service experience findings. Focus on customer service quality, responsiveness, support channel effectiveness, and service innovation. Reference specific company examples.`,
  brand_experience: `Analyze brand experience insights. Cover brand perception, trust, loyalty, and emotional connection. Highlight companies with strong brand differentiation.`,
  employee_experience: `Analyze employee experience and its impact on CX outcomes. Discuss employee engagement, empowerment, training, and how it translates to customer-facing results.`,
  industry_spotlight: `Provide a focused industry analysis. Identify trends, leaders, and gaps within the industry. Compare how different companies approach CX within their sector.`,
  recommendations: `Write actionable strategic recommendations. Base each recommendation on specific data-backed findings from the analysis. Structure as: observation → implication → recommended action.`,
};

export function buildReportPrompt(
  sectionId: ReportSectionId,
  insights: TaggedInsight[],
  existingDraft?: string,
  userInstruction?: string
): string {
  const sectionMeta = REPORT_SECTIONS.find((s) => s.id === sectionId);
  const guidance = SECTION_GUIDANCE[sectionId];

  const insightsBlock = insights
    .map((insight, i) => {
      if (insight.type === "data_table" && insight.tableRows?.length) {
        const rows = insight.tableRows;
        const columns = Object.keys(rows[0]).join(" | ");
        const preview = rows
          .slice(0, 5)
          .map((row) => Object.values(row).join(" | "))
          .join("\n");
        return `[${i + 1}] DATA TABLE: ${insight.tableLabel ?? "Score Results"}\nColumns: ${columns}\nTop rows:\n${preview}${rows.length > 5 ? `\n... (${rows.length - 5} more rows)` : ""}`;
      }
      return `[${i + 1}] Company: ${insight.companyName} | Industry: ${insight.industry}${insight.pillar ? ` | Pillar: ${insight.pillar}` : ""}\n${insight.content}`;
    })
    .join("\n\n");

  let prompt = `You are a CX research report writer for the Twimbit CX Stars benchmarking programme.

## Task
Generate the "${sectionMeta?.label}" section of a CX Stars report.

## Section Guidance
${guidance}

## Tagged Insights (from analyst research)
${insightsBlock || "No specific insights tagged — write based on general CX best practices."}

## Output Rules
1. Output ONLY valid HTML suitable for a rich text editor. Use: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <blockquote>, <strong>, <em>
2. Do NOT wrap in <html>, <body>, or <div> tags. Start directly with content.
3. NEVER invent scores, rankings, or data that is not in the provided insights.
4. Write 250-400 words per section.
5. Professional, third-person analytical tone.
6. Cite specific company names and data points from the insights.
7. Structure as: finding → evidence → implication.
8. Do NOT include the section title as an H1 — the editor already shows it.`;

  if (existingDraft && userInstruction) {
    prompt += `

## Revision Request
The analyst wants you to revise the existing draft below.

### Current Draft
${existingDraft}

### Analyst Instruction
"${userInstruction}"

Revise the draft according to the instruction. Output the FULL revised HTML, not just the changed parts.`;
  } else if (existingDraft) {
    prompt += `

## Existing Draft (for context)
There is an existing draft for this section. Generate a new version that improves upon it:
${existingDraft}`;
  }

  return prompt;
}
