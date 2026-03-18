import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildReportPrompt } from "@/lib/ai/prompts/reportPrompt";
import type { ReportSectionId, TaggedInsight } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sectionId,
      insights,
      datasetId,
      existingDraft,
      userInstruction,
    }: {
      sectionId: ReportSectionId;
      insights: TaggedInsight[];
      datasetId: string;
      existingDraft?: string;
      userInstruction?: string;
    } = body;

    if (!sectionId || !datasetId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sectionId, datasetId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildReportPrompt(
      sectionId,
      insights || [],
      existingDraft,
      userInstruction
    );

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = anthropic.messages.stream({
            model: "claude-sonnet-4-5-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: userInstruction
                  ? `Please revise the section: ${userInstruction}`
                  : `Generate the ${sectionId.replace(/_/g, " ")} section based on the tagged insights provided.`,
              },
            ],
          });

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ html: event.delta.text })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          console.error("Report draft stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message || "Stream error" })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Report draft error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
