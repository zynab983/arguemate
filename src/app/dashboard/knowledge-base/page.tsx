'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Database,
  Upload,
  FileText,
  File,
  FileType2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KBDocument {
  id: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'txt';
  chunk_count: number;
  created_at: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  fileName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileTypeIcon(type: string) {
  if (type === 'pdf')  return <FileType2 className="h-4 w-4 text-danger" />;
  if (type === 'docx') return <File      className="h-4 w-4 text-accent" />;
  return                     <FileText   className="h-4 w-4 text-text-secondary" />;
}

function fileTypeBadgeTone(type: string): 'accent' | 'neutral' {
  return type === 'pdf' ? 'accent' : 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const ACCEPTED_EXT = '.pdf,.docx,.txt';

// ─── Component ────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [userId, setUserId]       = useState<string | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [dragging, setDragging]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load user & documents ──────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setUserId(session.user.id);
      await fetchDocuments(session.user.id);
    }
    init();
  }, []);

  const fetchDocuments = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/kb/documents?userId=${uid}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    if (!userId) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadState({ status: 'error', message: 'Only PDF, DOCX, and TXT files are supported.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadState({ status: 'error', message: 'File must be smaller than 10 MB.' });
      return;
    }

    setUploadState({ status: 'uploading', fileName: file.name });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    try {
      const res  = await fetch('/api/kb/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadState({
        status:   'success',
        message:  `"${file.name}" indexed (${data.chunkCount} chunks)`,
        fileName: file.name,
      });

      // Refresh document list
      await fetchDocuments(userId);

      // Auto-clear success after 4 s
      setTimeout(() => setUploadState({ status: 'idle' }), 4000);
    } catch (err: any) {
      setUploadState({ status: 'error', message: err.message || 'Upload failed. Please try again.' });
    }
  }, [userId, fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // reset input so same file can be re-uploaded after deletion
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteDocument = async (docId: string) => {
    if (!userId) return;
    setDeletingId(docId);
    try {
      const res = await fetch(
        `/api/kb/documents?documentId=${docId}&userId=${userId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Delete failed');
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      console.error('[KB] delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isUploading = uploadState.status === 'uploading';

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-accent" />
            <span className="text-caption text-text-secondary uppercase">Knowledge Base</span>
          </div>
          <h1 className="text-heading text-text">Your Documents</h1>
          <p className="text-body text-text-secondary mt-1 max-w-prose">
            Upload research papers, notes, or any text-based material. ArgueBot will draw on this knowledge during your debates when you enable the <strong className="text-text">Use Knowledge Base</strong> toggle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="hidden sm:flex shrink-0 items-center gap-2 rounded-input border border-accent bg-accent-subtle px-4 py-2.5 text-sm font-semibold text-accent-hover hover:bg-accent hover:text-text-inverse transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* How it works banner */}
      <Card className="p-5 flex items-start gap-4 border-accent-border bg-accent-subtle">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-text-inverse">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text">How the Knowledge Base works</h3>
          <p className="text-xs text-text-secondary leading-relaxed mt-1">
            Each uploaded document is split into chunks and converted into semantic embeddings using Gemini AI.
            During a debate, the system finds the chunks most relevant to your current exchange and includes them
            as hidden context — giving ArgueBot (and you) access to the specific facts in your documents.
          </p>
        </div>
      </Card>

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed
          p-10 text-center cursor-pointer transition-colors duration-150
          ${dragging
            ? 'border-accent bg-accent-subtle'
            : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXT}
          className="sr-only"
          onChange={handleFileChange}
        />

        {isUploading ? (
          <>
            <Loader2 className="h-9 w-9 text-accent animate-spin" />
            <div>
              <p className="text-sm font-semibold text-text">Processing…</p>
              <p className="text-xs text-text-secondary mt-1">
                Extracting text and generating embeddings for <span className="text-text font-medium">{uploadState.fileName}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-card border border-border bg-surface-2 text-text-secondary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {dragging ? 'Drop your file here' : 'Drop a file or click to browse'}
              </p>
              <p className="text-xs text-text-muted mt-1">PDF, DOCX, or TXT · max 10 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Status message */}
      {uploadState.status === 'success' && (
        <div className="flex items-center gap-3 rounded-input border border-success-border bg-success-subtle px-4 py-3 animate-slide-up">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          <p className="text-sm text-success font-medium">{uploadState.message}</p>
          <button
            onClick={() => setUploadState({ status: 'idle' })}
            className="ml-auto text-success/60 hover:text-success"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadState.status === 'error' && (
        <div className="flex items-center gap-3 rounded-input border border-danger-border bg-danger-subtle px-4 py-3 animate-slide-up">
          <AlertCircle className="h-4 w-4 text-danger shrink-0" />
          <p className="text-sm text-danger font-medium">{uploadState.message}</p>
          <button
            onClick={() => setUploadState({ status: 'idle' })}
            className="ml-auto text-danger/60 hover:text-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-subheading text-text">Indexed Documents</h2>
          {documents.length > 0 && (
            <Badge tone="neutral">{documents.length} file{documents.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-card bg-surface animate-pulse border border-border" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No documents yet"
            description="Upload a PDF, DOCX, or TXT file above to get started. Your documents will be indexed and available in all future debates."
            action={
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-input border border-accent bg-accent-subtle px-4 py-2 text-sm font-semibold text-accent-hover hover:bg-accent hover:text-text-inverse transition-colors duration-150"
              >
                <Upload className="h-4 w-4" />
                Upload your first document
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 border border-border">
                  {fileTypeIcon(doc.file_type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text truncate">{doc.file_name}</p>
                    <Badge tone={fileTypeBadgeTone(doc.file_type)}>{doc.file_type.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''} · {formatDate(doc.created_at)}
                  </p>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteDocument(doc.id)}
                  disabled={deletingId === doc.id}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border text-text-muted hover:border-danger-border hover:bg-danger-subtle hover:text-danger transition-colors duration-150 disabled:opacity-40"
                  aria-label={`Delete ${doc.file_name}`}
                >
                  {deletingId === doc.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile upload button */}
      <div className="sm:hidden">
        <Button
          fullWidth
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          {isUploading ? 'Uploading…' : 'Upload Document'}
        </Button>
      </div>
    </div>
  );
}
