export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function chunkText(input: string, chunkSize = 700): string[] {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }

  return chunks;
}
