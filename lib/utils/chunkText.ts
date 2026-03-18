interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

/**
 * Split text into overlapping chunks for embedding.
 * Uses character count as a proxy for tokens (~4 chars/token).
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { maxChars = 2000, overlap = 200 } = options;

  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxChars) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    if (end >= text.length) break;
    start = end - overlap;
  }

  return chunks;
}
