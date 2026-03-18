import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveFileLocally } from "@/lib/storage/local";
import { parseXlsx } from "@/lib/utils/parseXlsx";
import { chunkText } from "@/lib/utils/chunkText";
import { embedTexts } from "@/lib/embeddings/voyage";

/** Stream an SSE event line */
function evt(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: object) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: NextRequest) {
  // Read form data before streaming starts
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string) || "Untitled Dataset";
  const year = (formData.get("year") as string) || new Date().getFullYear().toString();
  const country = (formData.get("country") as string) || "Global";

  if (!file) {
    return new Response(
      `data: ${JSON.stringify({ error: "No file provided" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }
  if (!file.name.endsWith(".xlsx")) {
    return new Response(
      `data: ${JSON.stringify({ error: "Only .xlsx files are accepted" })}\n\n`,
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // ── Stage 1: Parse workbook ─────────────────────────────
        evt(controller, encoder, { progress: 5, stage: "Parsing workbook…" });
        const fileUrl = await saveFileLocally(file.name, buffer);
        const parsed = await parseXlsx(buffer);
        const companyCount = parsed.companies.length;
        evt(controller, encoder, {
          progress: 15,
          stage: `Parsed ${companyCount} companies`,
        });

        // ── Stage 2: Create dataset record ─────────────────────
        evt(controller, encoder, { progress: 18, stage: "Creating dataset record…" });
        const { data: dataset, error: datasetError } = await supabaseAdmin
          .from("datasets")
          .insert({
            name,
            year: parseInt(year, 10),
            country,
            file_url: fileUrl,
            status: "processing",
            company_count: companyCount,
          })
          .select("id")
          .single();

        if (datasetError || !dataset) {
          throw new Error(datasetError?.message || "Failed to create dataset");
        }
        const datasetId = dataset.id;

        // ── Stage 3: Insert companies ──────────────────────────
        evt(controller, encoder, { progress: 22, stage: "Inserting company records…" });
        const companyRows = parsed.companies.map((company: any) => ({
          dataset_id: datasetId,
          company_name: company.company_name,
          industry: company.industry,
          cx_star_rating: company.cx_star_rating ?? company.overall_score ?? null,
          cx_star_mastery: company.cx_star_mastery ?? company.mastery_band ?? null,
          digital_score: company.pillarScores.digital_score,
          service_score: company.pillarScores.service_score,
          brand_score: company.pillarScores.brand_score,
          employee_score: company.pillarScores.employee_score,
        }));

        const { data: insertedCompanies, error: companiesError } = await supabaseAdmin
          .from("companies")
          .insert(companyRows)
          .select("id, company_name");

        if (companiesError) {
          await supabaseAdmin.from("datasets").update({ status: "error" }).eq("id", datasetId);
          throw new Error(`Failed to insert companies: ${companiesError.message}`);
        }
        evt(controller, encoder, { progress: 30, stage: `${companyCount} companies saved` });

        // Build lookup map
        const companyIdMap = new Map<string, string>();
        for (const c of insertedCompanies || []) {
          companyIdMap.set(c.company_name, c.id);
        }

        // ── Stage 4: Embed qualitative texts (the slow part) ───
        const quals = parsed.qualitativeTexts || [];
        const totalQuals = quals.length;
        let totalChunks = 0;

        if (totalQuals === 0) {
          evt(controller, encoder, { progress: 90, stage: "No qualitative data to embed" });
        } else {
          for (let i = 0; i < quals.length; i++) {
            const qual = quals[i];
            const companyId = companyIdMap.get(qual.company_name);
            if (!companyId) continue;

            const pct = 30 + Math.round(((i + 1) / totalQuals) * 58);
            evt(controller, encoder, {
              progress: pct,
              stage: `Embedding ${qual.company_name} (${i + 1}/${totalQuals})…`,
            });

            const chunks = chunkText(qual.content);
            if (chunks.length === 0) continue;

            const embeddings = await embedTexts(chunks);
            const chunkRows = chunks.map((content: string, idx: number) => ({
              company_id: companyId,
              chunk_type: "best_practice",
              pillar: qual.pillar || null,
              content,
              embedding: JSON.stringify(embeddings[idx]),
            }));

            const { error: chunkError } = await supabaseAdmin
              .from("qualitative_chunks")
              .insert(chunkRows);

            if (chunkError) {
              console.error(`Failed to insert chunks for ${qual.company_name}:`, chunkError.message);
            } else {
              totalChunks += chunks.length;
            }
          }
        }

        // ── Stage 5: Finalise ──────────────────────────────────
        evt(controller, encoder, { progress: 92, stage: "Finalising dataset…" });
        await supabaseAdmin.from("datasets").update({ status: "complete" }).eq("id", datasetId);

        const { data: completedDataset } = await supabaseAdmin
          .from("datasets")
          .select("*")
          .eq("id", datasetId)
          .single();

        evt(controller, encoder, {
          progress: 100,
          stage: "Complete!",
          result: {
            dataset: completedDataset,
            metadata: {
              companyCount: companyRows.length,
              industryCount: new Set(companyRows.map((c: any) => c.industry)).size,
              criteriaCount: parsed.metadata.criteriaCount,
              qualitativeCount: totalChunks,
            },
          },
        });

        controller.close();
      } catch (error: any) {
        console.error("Ingest error:", error);
        evt(controller, encoder, { error: error.message || "Internal server error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
