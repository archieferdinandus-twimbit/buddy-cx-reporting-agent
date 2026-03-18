import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { REPORT_SECTIONS } from "@/lib/constants/reportSections";
import type { ReportSectionId, ReportSectionState } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reportSections,
      title = "CX Stars Report",
      datasetName,
    }: {
      reportSections: Record<ReportSectionId, ReportSectionState>;
      title?: string;
      datasetName?: string;
    } = body;

    if (!reportSections) {
      return NextResponse.json(
        { error: "reportSections is required" },
        { status: 400 }
      );
    }

    // Build a text summary of the report content for the LLM
    let reportContent = "";
    for (const section of REPORT_SECTIONS) {
      const content = reportSections[section.id];
      if (!content || !content.html || content.status === "empty") continue;
      // Strip HTML tags for a clean text input
      const text = content.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      reportContent += `\n\n## ${section.label}\n${text}`;
    }

    if (!reportContent.trim()) {
      return NextResponse.json(
        { error: "No report content to generate a post from" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a LinkedIn content strategist for Twimbit, a CX research firm.

## Task
Generate a compelling LinkedIn post based on a CX Stars benchmarking report.

## LinkedIn Post Guidelines
1. Length: 200-280 words (optimal engagement range)
2. Start with an insight-led hook (first 2 lines must stop the scroll)
3. Include 2-3 specific data points or company mentions from the report
4. Use line breaks for readability (LinkedIn rewards white space)
5. Include a clear call-to-action at the end
6. Add 3-5 relevant hashtags at the very end
7. Professional but conversational tone — avoid corporate jargon
8. Use emojis sparingly (1-3 max) for visual breaks
9. Do NOT use markdown formatting — LinkedIn uses plain text
10. Separate paragraphs with blank lines

## Report Title: ${title}
${datasetName ? `## Dataset: ${datasetName}` : ""}

## Report Content
${reportContent}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Generate a LinkedIn post for this CX Stars report.",
        },
      ],
    });

    const postText =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ post: postText });
  } catch (error: any) {
    console.error("LinkedIn post generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate LinkedIn post" },
      { status: 500 }
    );
  }
}
