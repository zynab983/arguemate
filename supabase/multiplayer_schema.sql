-- ============================================================================
-- EdQuanta — Group Debate (multiplayer) schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query
-- Purely additive: new tables only, no changes to public.debates /
-- public.debate_messages (the existing 1-vs-AI feature). Safe to re-run —
-- uses IF NOT EXISTS / OR REPLACE everywhere, same convention as schema.sql.
--
-- If this is never run (or the project is paused/unreachable), the app
-- transparently falls back to an in-memory room store for local demoing —
-- see src/lib/rooms/store.ts.
-- ============================================================================

-- ── Rooms ────────────────────────────────────────────────────────────────────
create table if not exists public.debate_rooms (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique,   -- 6-char shareable room code
  -- text (not uuid) so the demo/mock user id also works before real auth,
  -- matching public.debates.user_id
  host_user_id           text not null,
  topic                  text not null,
  debate_style           text not null,
  difficulty             text not null,
  max_participants       integer not null check (max_participants between 2 and 6),

  status                 text not null default 'lobby'
                           check (status in ('lobby', 'in_progress', 'evaluating', 'completed', 'failed')),
  current_round          text check (current_round in ('opening', 'rebuttal', 'cross_questioning', 'final')),
  turn_order             jsonb not null default '[]'::jsonb, -- ordered array of room_participants.id
  turn_index             integer not null default 0,          -- pointer within the current round
  round_index            integer not null default 0,          -- 0=opening .. 3=final

  winner_participant_id  uuid,
  best_argument          text,
  best_rebuttal          text,
  summary                text,

  created_at             timestamptz not null default now(),
  started_at             timestamptz,
  completed_at           timestamptz
);

create unique index if not exists debate_rooms_code_idx on public.debate_rooms (code);

-- ── Participants ─────────────────────────────────────────────────────────────
create table if not exists public.room_participants (
  id                      uuid primary key default gen_random_uuid(),
  room_id                 uuid not null references public.debate_rooms (id) on delete cascade,
  user_id                 text not null,
  display_name            text not null,
  position                text check (position in ('Pro', 'Against')),
  is_host                 boolean not null default false,
  joined_at               timestamptz not null default now(),

  -- AI Judge scoring (0-100 each), filled in once the room completes
  score_argument_quality  integer check (score_argument_quality between 0 and 100),
  score_reasoning         integer check (score_reasoning between 0 and 100),
  score_relevance         integer check (score_relevance between 0 and 100),
  score_rebuttals         integer check (score_rebuttals between 0 and 100),
  score_clarity           integer check (score_clarity between 0 and 100),
  score_overall           integer check (score_overall between 0 and 100),
  judge_feedback          text,

  unique (room_id, user_id)
);

create index if not exists room_participants_room_id_idx on public.room_participants (room_id);

-- ── Messages (transcript, moderator + participant turns) ────────────────────
create table if not exists public.room_messages (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.debate_rooms (id) on delete cascade,
  participant_id  uuid references public.room_participants (id) on delete set null,
  role            text not null check (role in ('participant', 'moderator')),
  round           text check (round in ('opening', 'rebuttal', 'cross_questioning', 'final')),
  content         text not null,
  turn_index      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists room_messages_room_id_turn_idx on public.room_messages (room_id, turn_index);

-- Note: live sync in the app is done by lightweight polling (GET
-- /api/rooms/[code] every few seconds), not Supabase Realtime — so there's
-- no separate replication step to turn on here.

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The API routes use the SERVICE ROLE key, which bypasses RLS. RLS is
-- enabled with permissive read policies (rooms are joined by sharing a code,
-- similar to a Google Doc link — there's no per-row secret to protect here)
-- and no anon write policies, since all writes go through the API routes.
alter table public.debate_rooms      enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_messages     enable row level security;

drop policy if exists "Anyone can read rooms" on public.debate_rooms;
create policy "Anyone can read rooms"
  on public.debate_rooms for select
  using (true);

drop policy if exists "Anyone can read room participants" on public.room_participants;
create policy "Anyone can read room participants"
  on public.room_participants for select
  using (true);

drop policy if exists "Anyone can read room messages" on public.room_messages;
create policy "Anyone can read room messages"
  on public.room_messages for select
  using (true);
