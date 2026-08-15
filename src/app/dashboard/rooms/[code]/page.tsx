'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Crown, Copy, Check, ArrowRight, ArrowLeft, Loader2, Send,
  Trophy, Sparkles, Brain, Target, Swords, MessageSquare, Bot,
  AlertTriangle, RefreshCcw, Clock, ChevronRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea, FieldLabel } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { SkeletonText } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase/client';
import { getGuestId } from '@/lib/rooms/guestIdentity';
import { ROUNDS, ROUND_LABELS } from '@/lib/rooms/engine';
import type { RoomFullState, RoomParticipant } from '@/lib/rooms/types';

const DIMENSION_META = [
  { key: 'score_argument_quality', label: 'Argument Quality', icon: Sparkles, color: 'blue' },
  { key: 'score_reasoning', label: 'Reasoning', icon: Brain, color: 'violet' },
  { key: 'score_relevance', label: 'Relevance', icon: Target, color: 'amber' },
  { key: 'score_rebuttals', label: 'Rebuttals', icon: Swords, color: 'emerald' },
  { key: 'score_clarity', label: 'Clarity', icon: MessageSquare, color: 'cyan' },
] as const;

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', cyan: 'bg-cyan-500',
};
const TEXT_COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-600', violet: 'text-violet-600', amber: 'text-amber-600',
  emerald: 'text-emerald-600', cyan: 'text-cyan-600',
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-badge bg-border overflow-hidden">
      <div className={`h-full rounded-badge ${COLOR_MAP[color]} transition-all duration-700 ease-out`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function GroupDebateRoom() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || '').toUpperCase();

  const [guestId, setGuestId] = useState<string | null>(null);
  const [state, setState] = useState<RoomFullState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [posSubmitting, setPosSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [turnContent, setTurnContent] = useState('');
  const [submittingTurn, setSubmittingTurn] = useState(false);
  const [copied, setCopied] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGuestId(getGuestId());
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0];
      if (name) setJoinName(name);
    });
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Room not found.');
        setState(null);
      } else {
        setState(data);
        setError(null);
      }
    } catch {
      setError('Having trouble reaching the room — retrying…');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!guestId || !code) return;
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [guestId, code, fetchState]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.messages.length]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !guestId) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: guestId, displayName: joinName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data?.error || 'Failed to join the room.');
        return;
      }
      setState(data);
    } catch (err: any) {
      setJoinError(err?.message || 'An unexpected error occurred.');
    } finally {
      setJoining(false);
    }
  };

  const handleSetPosition = async (position: 'Pro' | 'Against') => {
    if (!guestId) return;
    setPosSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: guestId, position }),
      });
      const data = await res.json();
      if (res.ok) setState(data);
    } finally {
      setPosSubmitting(false);
    }
  };

  const handleStart = async () => {
    if (!guestId) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: guestId }),
      });
      const data = await res.json();
      if (res.ok) setState(data);
      else setError(data?.error || 'Failed to start the debate.');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !turnContent.trim()) return;
    setSubmittingTurn(true);
    try {
      const res = await fetch(`/api/rooms/${code}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: guestId, content: turnContent.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setState(data);
        setTurnContent('');
      } else {
        setError(data?.error || 'Failed to submit your turn.');
      }
    } finally {
      setSubmittingTurn(false);
    }
  };

  const handleRetry = async () => {
    if (!guestId) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/rooms/${code}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: guestId }),
      });
      const data = await res.json();
      if (res.ok) setState(data);
    } finally {
      setRetrying(false);
    }
  };

  const handleCopy = () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/rooms/${code}` : code;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // ── Loading / not found ─────────────────────────────────────────────────
  if (loading || !guestId) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6">
        <div className="rounded-card border border-border bg-surface p-8"><SkeletonText lines={3} /></div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8">
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5" />}
          title="Couldn't load this room"
          description={error}
          action={
            <Link href="/dashboard/rooms/new">
              <Button size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to Group Debate</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!state) return null;

  const { room, participants, messages } = state;
  const myParticipant = participants.find((p) => p.user_id === guestId);
  const isHost = !!myParticipant?.is_host;
  const currentSpeakerId = room.turn_order[room.turn_index];
  const currentSpeaker = participants.find((p) => p.id === currentSpeakerId);
  const isMyTurn = room.status === 'in_progress' && myParticipant?.id === currentSpeakerId;

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-accent" />
          <span className="text-caption text-text-secondary uppercase">Group Debate</span>
          <Badge tone="neutral">{room.debate_style}</Badge>
          <Badge tone="neutral">{room.difficulty}</Badge>
        </div>
        <h1 className="text-heading text-text truncate">{room.topic}</h1>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 flex items-center gap-2 rounded-input border border-border bg-surface px-4 py-2 hover:border-border-strong transition-colors duration-150"
      >
        <span className="font-mono text-sm font-bold tracking-[0.2em] text-text">{room.code}</span>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-text-secondary" />}
      </button>
    </div>
  );

  // ── Not a participant yet ────────────────────────────────────────────────
  if (!myParticipant) {
    if (room.status !== 'lobby') {
      return (
        <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6">
          {header}
          <EmptyState
            icon={<Clock className="h-5 w-5" />}
            title="This debate has already started"
            description="New participants can't join once a room is in progress. Ask the host for a fresh room code next time."
            action={
              <Link href="/dashboard/rooms/new">
                <Button size="sm">Start your own room</Button>
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6">
        {header}
        <Card className="p-6 space-y-4 max-w-md">
          <h2 className="text-subheading text-text">Join this debate</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <FieldLabel>Your Display Name</FieldLabel>
              <Input required value={joinName} onChange={(e) => setJoinName(e.target.value)} maxLength={40} placeholder="e.g. Jordan" />
            </div>
            {joinError && <ErrorState description={joinError} />}
            <Button type="submit" fullWidth loading={joining} rightIcon={!joining ? <ArrowRight className="h-4 w-4" /> : undefined}>
              Join Room
            </Button>
          </form>
        </Card>
        {participants.length > 0 && (
          <div className="space-y-2 max-w-md">
            <p className="text-caption text-text-secondary uppercase">Already here ({participants.length}/{room.max_participants})</p>
            {participants.map((p) => <ParticipantRow key={p.id} p={p} />)}
          </div>
        )}
      </div>
    );
  }

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (room.status === 'lobby') {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6 pb-16">
        {header}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-subheading text-text">Lobby</h2>
              <Badge tone="neutral">{participants.length}/{room.max_participants} joined</Badge>
            </div>
            <div className="space-y-2">
              {participants.map((p) => <ParticipantRow key={p.id} p={p} highlight={p.id === myParticipant.id} />)}
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-caption text-text-secondary uppercase mb-3">Your Position</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={posSubmitting}
                  onClick={() => handleSetPosition('Pro')}
                  className={`py-4 rounded-input border text-sm font-semibold transition-colors duration-150 disabled:opacity-50 ${
                    myParticipant.position === 'Pro' ? 'border-success bg-success-subtle text-success' : 'border-border bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  PRO — For the Motion
                </button>
                <button
                  type="button"
                  disabled={posSubmitting}
                  onClick={() => handleSetPosition('Against')}
                  className={`py-4 rounded-input border text-sm font-semibold transition-colors duration-150 disabled:opacity-50 ${
                    myParticipant.position === 'Against' ? 'border-danger bg-danger-subtle text-danger' : 'border-border bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  AGAINST — Against the Motion
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-text">Share this room</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Send the code <span className="font-mono font-bold text-text">{room.code}</span> to your friends, or copy the join link above.
            </p>
            {isHost ? (
              <>
                <Button
                  fullWidth
                  loading={starting}
                  disabled={participants.length < 2}
                  onClick={handleStart}
                  rightIcon={!starting ? <ArrowRight className="h-4 w-4" /> : undefined}
                >
                  {starting ? 'Starting…' : 'Start Debate'}
                </Button>
                {participants.length < 2 && (
                  <p className="text-caption text-text-muted text-center">Need at least 2 participants to start.</p>
                )}
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Anyone who hasn't picked Pro or Against will be auto-balanced when the debate starts.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-input border border-border bg-surface-2 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
                <span className="text-sm text-text-secondary">Waiting for the host to start…</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Evaluating ───────────────────────────────────────────────────────────
  if (room.status === 'evaluating') {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6">
        {header}
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle border border-accent-border">
            <Bot className="h-5 w-5 text-accent animate-pulse" />
          </div>
          <h2 className="text-subheading text-text">The AI Judge is reviewing the debate…</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            Scoring every participant on argument quality, reasoning, relevance, rebuttals, and clarity. This takes a few seconds.
          </p>
        </Card>
      </div>
    );
  }

  // ── Failed evaluation ────────────────────────────────────────────────────
  if (room.status === 'failed') {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6">
        {header}
        <ErrorState
          icon={<AlertTriangle className="h-4 w-4" />}
          title="The AI Judge couldn't finish evaluating"
          description={room.summary || 'Something went wrong while scoring this debate.'}
          action={
            isHost ? (
              <Button size="sm" loading={retrying} onClick={handleRetry} leftIcon={!retrying ? <RefreshCcw className="h-3.5 w-3.5" /> : undefined}>
                Retry Evaluation
              </Button>
            ) : (
              <p className="text-xs text-text-secondary">Ask the host to retry evaluation.</p>
            )
          }
        />
      </div>
    );
  }

  // ── Completed — results ──────────────────────────────────────────────────
  if (room.status === 'completed') {
    const ranked = [...participants].sort((a, b) => (b.score_overall ?? 0) - (a.score_overall ?? 0));
    const winner = participants.find((p) => p.id === room.winner_participant_id);

    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6 pb-16">
        {header}

        <Card className="p-8 text-center space-y-3 border-accent-border bg-accent-subtle">
          <Trophy className="h-8 w-8 text-accent mx-auto" />
          <h2 className="text-heading text-text">
            {winner ? `${winner.display_name} wins the debate` : 'Debate complete'}
          </h2>
          {room.summary && <p className="text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">{room.summary}</p>}
        </Card>

        {(room.best_argument || room.best_rebuttal) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {room.best_argument && (
              <Card className="p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-caption text-text-secondary uppercase">
                  <Sparkles className="h-3.5 w-3.5" /> Best Argument
                </div>
                <p className="text-sm text-text leading-relaxed">{room.best_argument}</p>
              </Card>
            )}
            {room.best_rebuttal && (
              <Card className="p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-caption text-text-secondary uppercase">
                  <Swords className="h-3.5 w-3.5" /> Best Rebuttal
                </div>
                <p className="text-sm text-text leading-relaxed">{room.best_rebuttal}</p>
              </Card>
            )}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-subheading text-text">Individual Scores</h3>
          {ranked.map((p, i) => (
            <Card key={p.id} className={`p-6 space-y-4 ${p.id === room.winner_participant_id ? 'border-accent-border' : ''}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.display_name} tone={p.id === room.winner_participant_id ? 'accent' : 'neutral'} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-text truncate">{p.display_name}</p>
                      {p.id === room.winner_participant_id && <Trophy className="h-3.5 w-3.5 text-accent shrink-0" />}
                    </div>
                    <p className="text-caption text-text-secondary">#{i + 1} · {p.position ?? 'Unassigned'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-semibold text-text">{p.score_overall ?? '—'}</p>
                  <p className="text-[10px] text-text-muted">Overall</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {DIMENSION_META.map((d) => {
                  const value = (p as any)[d.key] ?? 0;
                  const Icon = d.icon;
                  return (
                    <div key={d.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${TEXT_COLOR_MAP[d.color]}`}>
                          <Icon className="h-3 w-3" /> {d.label}
                        </span>
                        <span className="text-[10px] font-bold text-text">{value}</span>
                      </div>
                      <ScoreBar value={value} color={d.color} />
                    </div>
                  );
                })}
              </div>

              {p.judge_feedback && <p className="text-xs text-text-secondary leading-relaxed border-t border-border pt-3">{p.judge_feedback}</p>}
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Link href="/dashboard/rooms/new">
            <Button leftIcon={<Users className="h-4 w-4" />}>Start Another Group Debate</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── In progress ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6 pb-16">
      {header}

      {/* Round progress */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {ROUNDS.map((r, i) => {
          const done = room.round_index > i;
          const active = room.round_index === i;
          return (
            <div key={r} className="flex items-center gap-2 shrink-0">
              <span
                className={`flex items-center gap-1.5 rounded-badge border px-3 py-1.5 text-xs font-semibold ${
                  active ? 'border-accent bg-accent-subtle text-accent-hover' : done ? 'border-success-border bg-success-subtle text-success' : 'border-border bg-surface text-text-secondary'
                }`}
              >
                {done && <Check className="h-3 w-3" />}
                {ROUND_LABELS[r]}
              </span>
              {i < ROUNDS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="max-h-[55vh] overflow-y-auto debate-chat p-5 space-y-4">
              {messages.map((m) => {
                if (m.role === 'moderator') {
                  return (
                    <div key={m.id} className="flex items-center gap-2 justify-center">
                      <div className="flex items-center gap-1.5 rounded-badge border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary max-w-[90%] text-center">
                        <Bot className="h-3 w-3 shrink-0" /> {m.content}
                      </div>
                    </div>
                  );
                }
                const speaker = participants.find((p) => p.id === m.participant_id);
                const mine = speaker?.id === myParticipant.id;
                return (
                  <div key={m.id} className={`flex items-end gap-2.5 max-w-[85%] ${mine ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}>
                    <Avatar name={speaker?.display_name || '?'} size="sm" tone={mine ? 'accent' : 'neutral'} />
                    <div className={`rounded-input px-4 py-3 text-sm leading-relaxed ${mine ? 'bg-text text-text-inverse rounded-br-sm' : 'bg-surface-2 border border-border text-text rounded-bl-sm'}`}>
                      <p className={`text-[10px] font-semibold uppercase mb-1 ${mine ? 'text-text-inverse/70' : 'text-text-secondary'}`}>
                        {speaker?.display_name} · {speaker?.position}
                      </p>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          </Card>

          {isMyTurn ? (
            <Card className="p-5 space-y-3 border-accent-border">
              <p className="text-sm font-semibold text-accent-hover">It's your turn — {ROUND_LABELS[ROUNDS[room.round_index]]}</p>
              <form onSubmit={handleSubmitTurn} className="space-y-3">
                <Textarea
                  required
                  rows={4}
                  autoFocus
                  placeholder="Make your case…"
                  value={turnContent}
                  onChange={(e) => setTurnContent(e.target.value)}
                  maxLength={4000}
                />
                <Button type="submit" loading={submittingTurn} rightIcon={!submittingTurn ? <Send className="h-4 w-4" /> : undefined} fullWidth>
                  {submittingTurn ? 'Submitting…' : 'Submit Argument'}
                </Button>
              </form>
            </Card>
          ) : (
            <div className="flex items-center gap-2 rounded-input border border-border bg-surface-2 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary shrink-0" />
              <span className="text-sm text-text-secondary">Waiting for {currentSpeaker?.display_name || 'the next speaker'}…</span>
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="space-y-2">
          <h3 className="text-caption text-text-secondary uppercase">Participants</h3>
          {participants.map((p) => (
            <ParticipantRow key={p.id} p={p} highlight={p.id === myParticipant.id} speaking={p.id === currentSpeakerId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({ p, highlight, speaking }: { p: RoomParticipant; highlight?: boolean; speaking?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-input border p-3 ${speaking ? 'border-accent bg-accent-subtle' : highlight ? 'border-border-strong bg-surface-2' : 'border-border bg-surface'}`}>
      <Avatar name={p.display_name} size="sm" tone={speaking ? 'accent' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-text truncate">{p.display_name}</p>
          {p.is_host && <Crown className="h-3 w-3 text-accent shrink-0" />}
        </div>
        {p.position && (
          <Badge tone={p.position === 'Pro' ? 'success' : 'danger'} className="mt-0.5">{p.position}</Badge>
        )}
      </div>
      {speaking && <span className="text-[10px] font-semibold text-accent-hover shrink-0">Speaking…</span>}
    </div>
  );
}
