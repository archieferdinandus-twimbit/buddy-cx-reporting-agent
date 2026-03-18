import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tableRows,
      tableLabel,
      userPrompt,
    }: {
      tableRows: Record<string, unknown>[];
      tableLabel?: string;
      userPrompt: string;
    } = body;

    if (!tableRows?.length || !userPrompt) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tableRows, userPrompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build structured table context
    const columns = Object.keys(tableRows[0]).join(" | ");
    const rowsText = tableRows
      .slice(0, 15)
      .map((row) => Object.values(row).map((v) => (typeof v === "number" && !Number.isInteger(v) ? Number(v).toFixed(2) : String(v ?? "—"))).join(" | "))
      .join("\n");
    const tableContext = `${tableLabel ? `Table: ${tableLabel}\n` : ""}Columns: ${columns}\nData:\n${rowsText}${tableRows.length > 15 ? `\n... (${tableRows.length - 15} more rows)` : ""}`;

    const systemPrompt = `You are a CX research analyst for the Twimbit CX Stars benchmarking programme. You are given a data table and a user instruction. Write a concise, insightful analytical description of the data per the instruction.

Output rules:
- Output ONLY valid HTML. Use only <p> and <strong> tags.
- Write 1-3 focused paragraphs.
- Cite specific company names and numbers from the data.
- Professional, third-person analytical tone.
- Do NOT invent data not present in the table.
- Do NOT include headings or titles.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: `Data table:\n${tableContext}\n\nInstruction: ${userPrompt}`,
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
          console.error("Table describe stream error:", error);
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
    console.error("Table describe error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
