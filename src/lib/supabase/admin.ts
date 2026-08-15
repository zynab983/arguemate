// Server-only Supabase client using the service role key (bypasses RLS).
// Mirrors the local getSupabaseClient() pattern already used in
// src/app/api/debates/route.ts — pulled out here so the new room routes
// (src/lib/rooms/*) can share it without duplicating the guard logic.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getServiceClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your_')) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
