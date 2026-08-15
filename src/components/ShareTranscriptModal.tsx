'use client';

import { useState, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareMessage {
  role: 'user' | 'ai' | 'assistant';
  content: string;
}

export interface ShareDebateMeta {
  topic: string;
  difficulty?: string;
  debateStyle?: string;
  aiPersonality?: string;
  userStance?: string;
  score?: number | null;
  grade?: string | null;
  winner?: string | null;
  duration?: number;
}

interface ShareTranscriptModalProps {
  messages: ShareMessage[];
  meta: ShareDebateMeta;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function buildTranscript(messages: ShareMessage[], meta: ShareDebateMeta): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  lines.push('=====================================');
  lines.push('     EDQUANTA — DEBATE TRANSCRIPT');
  lines.push('=====================================');
  lines.push('');
  lines.push(`Topic      : ${meta.topic}`);
  if (meta.difficulty)    lines.push(`Difficulty : ${meta.difficulty}`);
  if (meta.debateStyle)   lines.push(`Style      : ${meta.debateStyle}`);
  if (meta.aiPersonality) lines.push(`AI Persona : ${meta.aiPersonality}`);
  if (meta.userStance)    lines.push(`My Stance  : ${meta.userStance}`);
  if (meta.duration)      lines.push(`Duration   : ${fmtDuration(meta.duration)}`);
  lines.push(`Date       : ${date}`);
  lines.push('');

  if (meta.winner || meta.score != null || meta.grade) {
    lines.push('--- RESULT ---');
    if (meta.winner) {
      const outcome =
        meta.winner === 'User' ? 'WON' :
        meta.winner === 'AI'   ? 'LOST' : 'DRAW';
      lines.push(`Outcome : ${outcome}`);
    }
    if (meta.score != null) lines.push(`Score   : ${meta.score} / 100`);
    if (meta.grade)         lines.push(`Grade   : ${meta.grade}`);
    lines.push('');
  }

  lines.push('--- TRANSCRIPT ---');
  lines.push('');

  messages.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const speaker = isUser ? 'YOU' : 'ARGUEBOT';
    const turnNum = Math.floor(idx / 2) + 1;
    const label   = isUser
      ? `Turn ${turnNum} — Your Argument`
      : idx === 0 ? 'Opening Argument' : `Turn ${turnNum} — Counter-Argument`;

    lines.push(`[ ${speaker} · ${label} ]`);

    // Soft word-wrap at ~80 chars
    const words = msg.content.split(' ');
    let line = '';
    for (const word of words) {
      if ((line + word).length > 80) {
        if (line) lines.push(line.trimEnd());
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
    lines.push('');
  });

  lines.push('=====================================');
  lines.push('Debated on EdQuanta · edquanta.com');
  lines.push('=====================================');

  return lines.join('\n');
}

function buildSocialSnippet(meta: ShareDebateMeta): string {
  const outcome =
    meta.winner === 'User' ? 'I won the debate!' :
    meta.winner === 'AI'   ? 'Lost this one — but learned a lot.' : 'It was a draw.';

  const scorePart =
    meta.score != null
      ? ` Score: ${meta.score}/100${meta.grade ? `, Grade: ${meta.grade}` : ''}.`
      : '';

  return (
    `Just finished a debate on ArgueМate!\n\n` +
    `Topic: "${meta.topic}"\n` +
    `${meta.difficulty ? `Difficulty: ${meta.difficulty}\n` : ''}` +
    `${outcome}${scorePart}\n\n` +
    `Practice your debate skills with AI at edquanta.com`
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareTranscriptModal({
  messages,
  meta,
  onClose,
}: ShareTranscriptModalProps) {
  const [copied, setCopied] = useState(false);
  const transcript = buildTranscript(messages, meta);
  const snippet    = buildSocialSnippet(meta);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcript);
    } catch {
      const el = document.createElement('textarea');
      el.value = transcript;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [transcript]);

  const shareOnX = useCallback(() => {
    const url  = encodeURIComponent('https://edquanta.com');
    const text = encodeURIComponent(snippet);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [snippet]);

  const shareOnLinkedIn = useCallback(() => {
    const url     = encodeURIComponent('https://edquanta.com');
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-text/40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-card border border-border bg-surface shadow-lg overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[10px] bg-accent-subtle border border-accent-border flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="h-4 w-4 text-accent" aria-hidden="true">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">One-Click Share</p>
              <h2 className="text-sm font-bold text-text leading-tight">Debate Transcript</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text transition-colors duration-150 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Transcript preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <pre
            className="w-full rounded-input border border-border bg-surface-2 p-4 text-[11px] leading-relaxed text-text-secondary font-mono whitespace-pre-wrap break-words select-all"
            style={{ scrollbarWidth: 'thin' }}
          >
            {transcript}
          </pre>
        </div>

        {/* Action bar */}
        <div className="shrink-0 border-t border-border px-6 py-4 space-y-3">
          {/* Copy button */}
          <button
            id="share-copy-transcript"
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-input border px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
              copied
                ? 'border-success-border bg-success-subtle text-success'
                : 'border-accent-border bg-accent-subtle text-accent hover:brightness-110'
            }`}
          >
            {copied
              ? <><Check className="h-4 w-4" /> Copied to clipboard!</>
              : <><Copy className="h-4 w-4" /> Copy Full Transcript</>
            }
          </button>

          {/* Social share */}
          <div className="flex gap-2">
            <button
              id="share-on-x"
              onClick={shareOnX}
              className="flex-1 flex items-center justify-center gap-2 rounded-input border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface hover:border-border-strong transition-all duration-150"
            >
              {/* X logo (inline SVG — no extra package needed) */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>

            <button
              id="share-on-linkedin"
              onClick={shareOnLinkedIn}
              className="flex-1 flex items-center justify-center gap-2 rounded-input border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface hover:border-border-strong transition-all duration-150"
            >
              {/* LinkedIn logo (inline SVG) */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Share on LinkedIn
            </button>
          </div>

          <p className="text-[10px] text-text-muted text-center leading-relaxed">
            Social buttons share a short result summary · the full transcript is copied to your clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}
