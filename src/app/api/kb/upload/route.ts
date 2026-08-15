import { NextRequest, NextResponse } from 'next/server';
import { chunkText, embedText } from '@/lib/rag';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Supabase service-role client ─────────────────────────────────────────────

function getServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Text extractors ──────────────────────────────────────────────────────────

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/pdf') {
    // pdf-parse ESM: the top-level export is the parser function itself.
    const pdfParse = await import('pdf-parse');
    // Support both `{ default: fn }` (CJS interop) and direct export
    const parseFn = (pdfParse as any).default ?? pdfParse;
    const result  = await parseFn(buffer);
    return result.text;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const result  = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file') as File | null;
    const userId   = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
    }

    // Validate type
    const mimeType = file.type;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload PDF, DOCX, or TXT files.' },
        { status: 415 }
      );
    }

    // Determine friendly file type label
    const fileTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
    };
    const fileType = fileTypeMap[mimeType];

    // Convert to Buffer for parsing
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Extract plain text
    const rawText = await extractText(buffer, mimeType);

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'Could not extract any text from the file.' }, { status: 422 });
    }

    // Chunk text
    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Document is too short to index.' }, { status: 422 });
    }

    const supabase = getServiceClient();

    // Create document record first
    const { data: docData, error: docError } = await supabase
      .from('kb_documents')
      .insert({
        user_id:     userId,
        file_name:   file.name,
        file_type:   fileType,
        chunk_count: chunks.length,
      })
      .select('id')
      .single();

    if (docError || !docData) {
      console.error('[KB Upload] document insert error:', docError);
      return NextResponse.json({ error: 'Failed to save document metadata.' }, { status: 500 });
    }

    const documentId = docData.id;

    // Embed each chunk and insert into kb_chunks
    const chunkRows: {
      document_id: string;
      user_id: string;
      content: string;
      embedding: number[];
      chunk_index: number;
    }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      chunkRows.push({
        document_id: documentId,
        user_id:     userId,
        content:     chunks[i],
        embedding,
        chunk_index: i,
      });
    }

    // Batch insert all chunks
    const { error: chunksError } = await supabase.from('kb_chunks').insert(chunkRows);

    if (chunksError) {
      // Roll back: delete the document (chunks cascade)
      await supabase.from('kb_documents').delete().eq('id', documentId);
      console.error('[KB Upload] chunks insert error:', chunksError);
      return NextResponse.json({ error: 'Failed to index document chunks.' }, { status: 500 });
    }

    return NextResponse.json({
      documentId,
      chunkCount: chunks.length,
      fileName:   file.name,
      fileType,
    });

  } catch (err: any) {
    console.error('[KB Upload] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
