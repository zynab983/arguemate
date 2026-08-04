-- ============================================================================
-- ArgueMate — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query
-- Creates the tables used by /api/debates (save + history + replay).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere.
-- ============================================================================

-- ── Debates ─────────────────────────────────────────────────────────────────
create table if not exists public.debates (
  id                   uuid primary key default gen_random_uuid(),
  -- text (not uuid) so the demo/mock user id also works before real auth
  user_id              text not null,
  topic                text not null,
  winner               text check (winner in ('User', 'AI', 'Draw')),
  score                integer check (score between 0 and 100),
  duration             integer default 0,           -- seconds
  difficulty           text,
  debate_style         text,
  ai_personality       text,
  message_count        integer default 0,

  -- AI evaluation breakdown (each 0–100)
  grade                text,
  score_logic          integer check (score_logic between 0 and 100),
  score_facts          integer check (score_facts between 0 and 100),
  score_persuasiveness integer check (score_persuasiveness between 0 and 100),
  score_confidence     integer check (score_confidence between 0 and 100),
  score_communication  integer check (score_communication between 0 and 100),
  score_relevance      integer check (score_relevance between 0 and 100),
  strengths            jsonb default '[]'::jsonb,
  weaknesses           jsonb default '[]'::jsonb,
  suggestions          jsonb default '[]'::jsonb,
  best_argument        text,
  fallacies            jsonb default '[]'::jsonb,
  summary              text,

  created_at           timestamptz not null default now()
);

create index if not exists debates_user_id_created_at_idx
  on public.debates (user_id, created_at desc);

-- ── Debate messages (full transcript, ordered by turn_index) ────────────────
create table if not exists public.debate_messages (
  id         uuid primary key default gen_random_uuid(),
  debate_id  uuid not null references public.debates (id) on delete cascade,
  role       text not null check (role in ('user', 'ai', 'assistant', 'model')),
  content    text not null,
  turn_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists debate_messages_debate_id_turn_idx
  on public.debate_messages (debate_id, turn_index);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The API routes use the SERVICE ROLE key, which bypasses RLS.
-- RLS is still enabled so the anon/public key cannot read other users' data.
alter table public.debates         enable row level security;
alter table public.debate_messages enable row level security;

drop policy if exists "Users can read own debates" on public.debates;
create policy "Users can read own debates"
  on public.debates for select
  using (auth.uid()::text = user_id);

drop policy if exists "Users can insert own debates" on public.debates;
create policy "Users can insert own debates"
  on public.debates for insert
  with check (auth.uid()::text = user_id);

drop policy if exists "Users can read own debate messages" on public.debate_messages;
create policy "Users can read own debate messages"
  on public.debate_messages for select
  using (
    exists (
      select 1 from public.debates d
      where d.id = debate_id and d.user_id = auth.uid()::text
    )
  );

drop policy if exists "Users can insert own debate messages" on public.debate_messages;
create policy "Users can insert own debate messages"
  on public.debate_messages for insert
  with check (
    exists (
      select 1 from public.debates d
      where d.id = debate_id and d.user_id = auth.uid()::text
    )
  );
