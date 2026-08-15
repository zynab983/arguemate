/**
 * src/lib/rag.ts
 * RAG (Retrieval-Augmented Generation) utilities for EdQuanta Knowledge Base.
 * - Chunks plain text into overlapping windows
 * - Embeds text via Gemini gemini-embedding-001 (3072 dim)
 * - Retrieves the most relevant chunks from Supabase for a given user
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_SIZE    = 500;  // approximate token / word window per chunk
const CHUNK_OVERLAP = 50;   // words carried over into the next chunk

// ─── Supabase service-role client (server-side only) ─────────────────────────

function getServiceClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseServiceClient(url, key);
}

// ─── Text chunking ─────────────────────────────────────────────────────────────

/**
 * Splits `text` into overlapping word-windows of ~CHUNK_SIZE words each.
 * Returns an array of non-empty chunk strings.
 */
export function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  let start = 0;
  while (start < words.length) {
    const end   = Math.min(start + CHUNK_SIZE, words.length);
    const chunk = words.slice(start, end).join(' ').trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end === words.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

// ─── Gemini embeddings ────────────────────────────────────────────────────────

/**
 * Embeds a single string using Gemini gemini-embedding-001 (3072 dimensions).
 * Uses the same GEMINI_API_KEY as the debate engine.
 * NOTE: text-embedding-004 was retired on Jan 14 2026; use gemini-embedding-001.
 */
export async function embedText(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  // outputDimensionality: 768 uses MRL to truncate to 768 dims,
  // keeping compatibility with the existing vector(768) Supabase column & HNSW index.
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    outputDimensionality: 768,
  } as any);
  return result.embedding.values;
}

// ─── RAG retrieval ────────────────────────────────────────────────────────────

export interface KBChunk {
  id: string;
  content: string;
  document_id: string;
  similarity: number;
}

/**
 * Calls the Supabase `match_kb_chunks` RPC function and returns the top-N
 * most relevant chunks for the given user.
 *
 * @param userId        – the authenticated user's id
 * @param queryEmbedding – pre-computed embedding of the query text
 * @param matchCount    – number of chunks to retrieve (default 5)
 */
export async function retrieveRelevantChunks(
  userId: string,
  queryEmbedding: number[],
  matchCount = 5
): Promise<KBChunk[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('match_kb_chunks', {
    query_embedding:  queryEmbedding,
    target_user_id:   userId,
    match_count:      matchCount,
  });

  if (error) {
    console.error('[RAG] retrieveRelevantChunks error:', error);
    return [];
  }

  return (data ?? []) as KBChunk[];
}

// ─── Convenience: embed + retrieve in one call ────────────────────────────────

/**
 * End-to-end RAG: embeds `queryText`, then retrieves the most relevant chunks.
 * Returns an empty array on any failure (non-blocking for the debate flow).
 */
export async function ragRetrieve(
  userId: string,
  queryText: string,
  matchCount = 5
): Promise<string[]> {
  try {
    const embedding = await embedText(queryText);
    const chunks    = await retrieveRelevantChunks(userId, embedding, matchCount);
    return chunks.map(c => c.content);
  } catch (err) {
    console.error('[RAG] ragRetrieve failed (non-fatal):', err);
    return [];
  }
}
