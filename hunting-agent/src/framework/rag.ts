import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export interface RagChunk {
  readonly chunk_id: string;
  readonly source_report: string;
  readonly report_title: string;
  readonly verdict: string;
  readonly tags: readonly string[];
  readonly section: string;
  readonly text: string;
  readonly token_count: number;
}

export interface RagHit extends RagChunk {
  readonly score: number;
}

export interface RagStoreMeta {
  readonly embedding_model: string;
  readonly dimensions: number;
  readonly chunk_count: number;
  readonly index_format: string;
}

function hashEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9.\\-]+/g) ?? [];
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const index = hash.readUInt32BE(0) % dimensions;
    const sign = hash[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function dot(a: readonly number[], b: readonly number[]): number {
  let score = 0;
  for (let i = 0; i < a.length; i += 1) score += a[i] * b[i];
  return score;
}

function readVector(buffer: Buffer, row: number, dimensions: number): number[] {
  const vector: number[] = [];
  for (let col = 0; col < dimensions; col += 1) {
    vector.push(buffer.readFloatLE((row * dimensions + col) * 4));
  }
  return vector;
}

export async function loadRagStore(root = "data/rag"): Promise<{
  chunks: RagChunk[];
  meta: RagStoreMeta;
  vectors: Buffer;
}> {
  const base = path.join(process.cwd(), root);
  const [chunksRaw, metaRaw, vectors] = await Promise.all([
    readFile(path.join(base, "chunks.json"), "utf8"),
    readFile(path.join(base, "store-meta.json"), "utf8"),
    readFile(path.join(base, "vectors.bin")),
  ]);
  const chunks = JSON.parse(chunksRaw) as RagChunk[];
  const meta = JSON.parse(metaRaw) as RagStoreMeta;
  if (vectors.byteLength !== chunks.length * meta.dimensions * 4) {
    throw new Error("RAG vector file size does not match chunk metadata");
  }
  return { chunks, meta, vectors };
}

export async function queryPriorInvestigations(query: string, k = 5): Promise<RagHit[]> {
  const { chunks, meta, vectors } = await loadRagStore();
  const queryVector = hashEmbedding(query, meta.dimensions);
  return chunks
    .map((chunk, index) => {
      const score = dot(queryVector, readVector(vectors, index, meta.dimensions));
      return { ...chunk, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function buildRagContext(hits: readonly RagHit[]): string {
  return hits
    .map((hit) => `[${hit.source_report} ${hit.section} score=${hit.score.toFixed(3)}]\n${hit.text}`)
    .join("\n\n");
}
