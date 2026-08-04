import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client uses service role — bypasses email confirmation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/auth/confirm-email
 * Body: { email: string }
 *
 * Uses the admin API to force-confirm an existing user's email
 * so they can sign in without clicking the confirmation link.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Find the user by email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const user = listData.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json({ error: 'No account found with that email.' }, { status: 404 });
    }

    // Update user to confirm email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      console.error('[confirm-email api] supabase error:', updateError);
      const msg = typeof updateError.message === 'string' && updateError.message.trim() ? updateError.message : '';
      return NextResponse.json(
        { error: msg || 'Could not reach the account service. Please wait a moment and try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[confirm-email api]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
