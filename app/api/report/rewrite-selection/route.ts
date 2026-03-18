import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { selectedText, instruction } = await req.json();

    if (!selectedText || !instruction) {
      return NextResponse.json(
        { error: "Missing selectedText or instruction" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert CX research editor. Your task is to rewrite a piece of text according to the given instruction.

Rules:
- Return ONLY the rewritten text — no preamble, no explanation, no quotes.
- Preserve the author's intent and key facts.
- Match the professional analytical tone of a CX benchmarking report.
- Output plain text (no markdown, no HTML).`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Instruction: ${instruction}\n\nText to rewrite:\n${selectedText}`,
        },
      ],
    });

    const rewrittenText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return NextResponse.json({ rewrittenText });
  } catch (error: any) {
    console.error("Rewrite selection error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
