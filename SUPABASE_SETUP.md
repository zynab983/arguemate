# Connect ArgueMate to Supabase (2 steps)

Everything in the app already works end-to-end (evaluation, dashboard cards, history, replay).
It currently falls back to mock storage because `.env` still has placeholder Supabase keys.
Do these two steps to make it save for real:

## 1. Create the tables

Supabase Dashboard → **SQL Editor** → New query → paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

This creates `debates` and `debate_messages` (with indexes and RLS) — the exact
tables `/api/debates` writes to and the history page reads from.

## 2. Fill in your keys

Supabase Dashboard → **Project Settings → API**, then replace these three lines in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — keep secret, server-only>
```

Restart `npm run dev`. The app auto-detects real keys (see `src/lib/supabase/client.ts`)
and switches from mock mode to Supabase — no code changes needed.

## How data flows

1. Debate ends → `/api/evaluate` asks Gemini for the 6-dimension scores, grade,
   strengths, weaknesses, suggestions, best argument, fallacies, and summary.
2. The arena shows the results dashboard, then POSTs everything to `/api/debates`,
   which inserts one row into `debates` and the full transcript into `debate_messages`.
3. `/dashboard/history` lists your debates (GET `/api/debates?userId=…`); clicking a
   card opens the replay modal, which fetches the transcript (GET `?debateId=…`).
