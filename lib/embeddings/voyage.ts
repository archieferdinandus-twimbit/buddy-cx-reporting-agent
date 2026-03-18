import { VoyageAIClient } from "voyageai";

const BATCH_SIZE = 128;
const MODEL = "voyage-4-lite";

let client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (!client) {
    client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY! });
  }
  return client;
}

/**
 * Embed a batch of text strings using Voyage AI.
 * Returns an array of 1024-dimensional vectors.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const voyage = getClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await voyage.embed({ input: batch, model: MODEL });
    const embeddings =
      response.data?.map((d: any) => d.embedding as number[]) ?? [];
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Embed a single text string. Convenience wrapper around embedTexts.
 */
export async function embedSingleText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
