-- ============================================================================
-- ArgueMate — Knowledge Base (RAG) schema
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query
-- Requires: pgvector extension (enabled by default in all Supabase projects)
-- Embedding model: gemini-embedding-001 (3072 dim)
--   NOTE: text-embedding-004 (768 dim) was retired Jan 14 2026
-- ============================================================================

-- Enable pgvector
create extension if not exists vector;

-- ── kb_documents ─────────────────────────────────────────────────────────────
-- One row per uploaded file.
create table if not exists public.kb_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,           -- matches auth.uid()::text
  file_name   text not null,
  file_type   text not null check (file_type in ('pdf', 'docx', 'txt')),
  chunk_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists kb_documents_user_id_idx
  on public.kb_documents (user_id, created_at desc);

-- ── kb_chunks ─────────────────────────────────────────────────────────────────
-- One row per text chunk, with its embedding vector.
create table if not exists public.kb_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents (id) on delete cascade,
  user_id     text not null,           -- denormalised for fast per-user queries
  content     text not null,
  embedding   vector(3072),            -- Gemini gemini-embedding-001 output dim
  chunk_index integer not null default 0,
  created_at  timestamptz not null default now()
);

-- HNSW index for fast approximate nearest-neighbour cosine search
create index if not exists kb_chunks_embedding_idx
  on public.kb_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists kb_chunks_user_id_idx
  on public.kb_chunks (user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.kb_documents enable row level security;
alter table public.kb_chunks    enable row level security;

-- Documents: users read/write only their own
drop policy if exists "KB: users read own documents" on public.kb_documents;
create policy "KB: users read own documents"
  on public.kb_documents for select
  using (auth.uid()::text = user_id);

drop policy if exists "KB: users insert own documents" on public.kb_documents;
create policy "KB: users insert own documents"
  on public.kb_documents for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "KB: users delete own documents" on public.kb_documents;
create policy "KB: users delete own documents"
  on public.kb_documents for delete
  using (auth.uid()::text = user_id);

-- Chunks: users read/write only their own
drop policy if exists "KB: users read own chunks" on public.kb_chunks;
create policy "KB: users read own chunks"
  on public.kb_chunks for select
  using (auth.uid()::text = user_id);

drop policy if exists "KB: users insert own chunks" on public.kb_chunks;
create policy "KB: users insert own chunks"
  on public.kb_chunks for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "KB: users delete own chunks" on public.kb_chunks;
create policy "KB: users delete own chunks"
  on public.kb_chunks for delete
  using (auth.uid()::text = user_id);

-- ── Similarity search function ────────────────────────────────────────────────
-- Called from the backend using the service-role key (bypasses RLS).
-- Returns the top `match_count` chunks for a given user ordered by cosine similarity.
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
