import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/kb/documents?userId=... ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('kb_documents')
    .select('id, file_name, file_type, chunk_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[KB Documents] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents.' }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

// ─── DELETE /api/kb/documents?documentId=... ──────────────────────────────────
export async function DELETE(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get('documentId');
  const userId     = request.nextUrl.searchParams.get('userId');

  if (!documentId || !userId) {
    return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership before deleting
  const { data: doc, error: fetchError } = await supabase
    .from('kb_documents')
    .select('id, user_id')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  if (doc.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  // Deleting the document cascades to kb_chunks
  const { error: deleteError } = await supabase
    .from('kb_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    console.error('[KB Documents] DELETE error:', deleteError);
    return NextResponse.json({ error: 'Failed to delete document.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
