import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/ai/prompts/systemPrompt";
import { getDataTools } from "@/lib/ai/tools";
import {
  executeQueryScores,
  executeSemanticSearch,
  executeGetCompanyProfile,
  executeComputeAggregate,
} from "@/lib/ai/tools";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function executeTool(
  toolName: string,
  input: Record<string, any>,
  datasetId: string
) {
  switch (toolName) {
    case "query_scores":
      return executeQueryScores(datasetId, input.sql);
    case "semantic_search":
      return executeSemanticSearch(
        datasetId,
        input.query,
        input.top_k,
        input.pillar
      );
    case "get_company_profile":
      return executeGetCompanyProfile(datasetId, input.company_name);
    case "compute_aggregate":
      return executeComputeAggregate(datasetId, input.sql);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, datasetId } = body;

    if (!messages || !datasetId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messages, datasetId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const dataTools = getDataTools(datasetId);
    const systemPrompt = buildSystemPrompt(datasetId);

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let conversationMessages = [...messages];
          let continueLoop = true;

          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5",
              max_tokens: 8192,
              system: systemPrompt,
              messages: conversationMessages,
              tools: dataTools,
            });

            // Process content blocks
            const toolResults: any[] = [];

            for (const block of response.content) {
              if (block.type === "text") {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: block.text })}\n\n`
                  )
                );
              } else if (block.type === "tool_use") {
                const result = await executeTool(
                  block.name,
                  block.input as Record<string, any>,
                  datasetId
                );

                // Emit tool result to the client for canvas rendering
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      toolResult: {
                        id: block.id,
                        toolName: block.name,
                        input: block.input,
                        result,
                      },
                    })}\n\n`
                  )
                );

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });
              }
            }

            // Continue agentic loop if tools were called
            if (response.stop_reason === "tool_use" && toolResults.length > 0) {
              conversationMessages = [
                ...conversationMessages,
                { role: "assistant", content: response.content },
                { role: "user", content: toolResults },
              ];
            } else {
              // end_turn — done
              continueLoop = false;
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          console.error("Agent stream error:", error);
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
    console.error("Agent error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
