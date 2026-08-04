import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client uses service role — bypasses email confirmation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Create user with email_confirm = true so they can sign in immediately
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ← auto-confirms email, no confirmation email needed
      user_metadata: { full_name: full_name || '' },
    });

    if (error) {
      console.error('[signup api] supabase error:', error);

      const msg = typeof error.message === 'string' && error.message.trim() ? error.message : '';

      // Handle "User already exists" gracefully
      if (msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: msg || 'Could not reach the account service. Please wait a moment and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: data.user }, { status: 201 });
  } catch (err: any) {
    console.error('[signup api]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
