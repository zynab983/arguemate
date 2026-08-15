-- ============================================================================
-- ArgueMate – KB Migration: update embedding dimension from 768 → 3072
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Reason: text-embedding-004 (768 dim) was retired Jan 14 2026.
--         New model: gemini-embedding-001 (3072 dim)
-- ============================================================================

-- 1. Drop the old HNSW index (must be dropped before altering column type)
drop index if exists public.kb_chunks_embedding_idx;

-- 2. Drop all existing chunks (they were embedded with the old model, incompatible)
truncate table public.kb_chunks;

-- 3. Alter the embedding column to the new dimension
alter table public.kb_chunks
  alter column embedding type vector(3072);

-- 4. Recreate the HNSW index for the new dimension
create index kb_chunks_embedding_idx
  on public.kb_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 5. Update the similarity-search function signature to use vector(3072)
create or replace function public.match_kb_chunks(
  query_embedding   vector(3072),
  target_user_id    text,
  match_count       int default 5
)
returns table (
  id          uuid,
  content     text,
  document_id uuid,
  similarity  float
)
language sql stable
as $$
  select
    kc.id,
    kc.content,
    kc.document_id,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.kb_chunks kc
  where kc.user_id = target_user_id
    and kc.embedding is not null
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
