'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, Loader2, ArrowLeft, Sparkles, Star, Target, TrendingUp,
  MessageSquare, Briefcase, RefreshCcw, CheckCircle2, XCircle, Lightbulb,
  Flag, Bot, User,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/EmptyState';
import { CATEGORY_CONFIGS, isPrepareCategory, type PrepareCategory } from '@/lib/prepare/categories';
import type { PrepareMessage, PrepareEvaluation } from '@/lib/prepare/types';

const DIMENSION_META: { key: keyof PrepareEvaluation['scores']; label: string; icon: any; color: string }[] = [
  { key: 'clarity', label: 'Clarity', icon: MessageSquare, color: 'blue' },
  { key: 'confidence', label: 'Confidence', icon: Star, color: 'amber' },
  { key: 'relevance', label: 'Relevance', icon: Target, color: 'violet' },
  { key: 'impact', label: 'Impact', icon: TrendingUp, color: 'emerald' },
  { key: 'professionalism', label: 'Professionalism', icon: Briefcase, color: 'cyan' },
];

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500', amber: 'bg-amber-500', violet: 'bg-violet-500',
  emerald: 'bg-emerald-500', cyan: 'bg-cyan-500',
};
const TEXT_COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-600', amber: 'text-amber-600', violet: 'text-violet-600',
  emerald: 'text-emerald-600', cyan: 'text-cyan-600',
};

function gradeClasses(grade: string): string {
  if (grade.startsWith('A')) return 'text-success border-success-border bg-success-subtle';
  if (grade.startsWith('B') || grade.startsWith('C')) return 'text-text border-border bg-surface-2';
  return 'text-danger border-danger-border bg-danger-subtle';
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-badge bg-border overflow-hidden">
      <div className={`h-full rounded-badge ${COLOR_MAP[color]} transition-all duration-700 ease-out`} style={{ width: `${value}%` }} />
    </div>
  );
}

function PrepareSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get('category') || '';
  const difficulty = searchParams.get('difficulty') || 'Intermediate';
  const category: PrepareCategory | null = isPrepareCategory(categoryParam) ? categoryParam : null;
  const config = category ? CATEGORY_CONFIGS[category] : null;

  const context: Record<string, string> = {};
  if (config) {
    for (const field of config.contextFields) {
      const v = searchParams.get(field.key);
      if (v) context[field.key] = v;
    }
  }

  const [messages, setMessages] = useState<PrepareMessage[]>([]);
  const [loadingOpening, setLoadingOpening] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<PrepareEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const fetchOpening = useCallback(async () => {
    if (!config) return;
    setLoadingOpening(true);
    setError(null);
    try {
      const res = await fetch('/api/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, context, difficulty, isOpening: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to start the session.');
        return;
      }
      setMessages([{ role: 'ai', content: data.message, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoadingOpening(false);
    }
  }, [category, difficulty, JSON.stringify(context), config]);

  useEffect(() => {
    if (startedRef.current || !config) return;
    startedRef.current = true;
    fetchOpening();
  }, [config, fetchOpening]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !config) return;

    const nextMessages: PrepareMessage[] = [...messages, { role: 'user', content: input.trim(), timestamp: new Date().toISOString() }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, context, difficulty, isOpening: false, messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to get a response.');
        return;
      }
      setMessages((prev) => [...prev, { role: 'ai', content: data.message, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSending(false);
    }
  };

  const handleEndSession = async () => {
    if (!config) return;
    setEvaluating(true);
    setEvalError(null);
    try {
      const res = await fetch('/api/prepare/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, context, difficulty, messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEvalError(data?.error || 'Failed to evaluate this session.');
        return;
      }
      setEvaluation(data.evaluation);
    } catch (err: any) {
      setEvalError(err?.message || 'An unexpected error occurred.');
    } finally {
      setEvaluating(false);
    }
  };

  if (!config) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8">
        <ErrorState
          title="Unknown practice category"
          description="Please head back and pick a category from the Prepare hub."
          action={
            <Link href="/dashboard/prepare">
              <Button size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to Prepare</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const userTurnCount = messages.filter((m) => m.role === 'user').length;

  // ── Results view ─────────────────────────────────────────────────────────
  if (evaluation) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6 pb-16">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-caption text-text-secondary uppercase">{config.label} · Results</span>
        </div>

        <Card className="p-8 text-center space-y-3 border-accent-border bg-accent-subtle">
          <div className={`inline-flex items-center gap-2 rounded-badge border px-4 py-1.5 text-sm font-bold ${gradeClasses(evaluation.grade)}`}>
            Grade {evaluation.grade}
          </div>
          <h2 className="text-heading text-text">{evaluation.verdict}</h2>
          <p className="text-3xl font-semibold text-text">{evaluation.overall}<span className="text-sm text-text-secondary font-normal">/100</span></p>
          {evaluation.summary && <p className="text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">{evaluation.summary}</p>}
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-text">Performance Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {DIMENSION_META.map((d) => {
              const value = evaluation.scores[d.key];
              const Icon = d.icon;
              return (
                <div key={d.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${TEXT_COLOR_MAP[d.color]}`}>
                      <Icon className="h-3.5 w-3.5" /> {d.label}
                    </span>
                    <span className="text-xs font-bold text-text">{value}</span>
                  </div>
                  <ScoreBar value={value} color={d.color} />
                </div>
              );
            })}
          </div>
        </Card>

        {evaluation.bestMoment && (
          <Card className="p-5 space-y-2">
            <div className="flex items-center gap-1.5 text-caption text-text-secondary uppercase">
              <Sparkles className="h-3.5 w-3.5" /> Best Moment
            </div>
            <p className="text-sm text-text leading-relaxed">{evaluation.bestMoment}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {evaluation.strengths.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Strengths
              </div>
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-2">
                    <span className="text-success shrink-0">•</span>{s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {evaluation.weaknesses.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-danger">
                <XCircle className="h-4 w-4" /> Weaknesses
              </div>
              <ul className="space-y-2">
                {evaluation.weaknesses.map((s, i) => (
                  <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-2">
                    <span className="text-danger shrink-0">•</span>{s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {evaluation.tips.length > 0 && (
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <Lightbulb className="h-4 w-4 text-accent" /> Improvement Tips
            </div>
            <ul className="space-y-2">
              {evaluation.tips.map((s, i) => (
                <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-2">
                  <span className="text-accent shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button variant="secondary" leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => window.location.reload()}>
            Practice Again
          </Button>
          <Link href="/dashboard/prepare">
            <Button leftIcon={<Briefcase className="h-4 w-4" />}>Back to Prepare Hub</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Evaluating ───────────────────────────────────────────────────────────
  if (evaluating) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8">
        <Card className="p-10 flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle border border-accent-border">
            <Bot className="h-5 w-5 text-accent animate-pulse" />
          </div>
          <h2 className="text-subheading text-text">Scoring your session…</h2>
          <p className="text-sm text-text-secondary max-w-sm">Reviewing clarity, confidence, relevance, impact, and professionalism.</p>
        </Card>
      </div>
    );
  }

  // ── Live session ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-accent" />
            <span className="text-caption text-text-secondary uppercase">Prepare</span>
            <Badge tone="neutral">{difficulty}</Badge>
          </div>
          <h1 className="text-heading text-text">{config.label}</h1>
          <p className="text-caption text-text-secondary mt-1">Practicing with: {config.aiRoleLabel}</p>
        </div>
        <Link href="/dashboard/prepare" className="shrink-0 flex items-center gap-2 rounded-input border border-border bg-surface px-4 py-2 text-caption text-text-secondary hover:border-border-strong hover:text-text transition-colors duration-150">
          <ArrowLeft className="h-3.5 w-3.5" /> Exit
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="debate-chat max-h-[55vh] overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2.5 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role !== 'user' ? 'bg-surface-2 border border-border text-text-secondary' : 'bg-text text-text-inverse'
              }`}>
                {m.role !== 'user' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div className={`rounded-input px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                m.role !== 'user'
                  ? 'bg-surface-2 border border-border text-text rounded-bl-sm'
                  : 'bg-text text-text-inverse rounded-br-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {(loadingOpening || sending) && (
            <div className="flex items-end gap-2.5 mr-auto">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 border border-border text-text-secondary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-input rounded-bl-sm bg-surface-2 border border-border px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-text-secondary" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </Card>

      {error && <ErrorState description={error} />}

      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          rows={3}
          placeholder={loadingOpening ? 'Waiting for the session to begin…' : 'Type your response…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loadingOpening || sending}
          maxLength={4000}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" loading={sending} disabled={loadingOpening || !input.trim()} rightIcon={!sending ? <Send className="h-4 w-4" /> : undefined} className="flex-1">
            {sending ? 'Sending…' : 'Send Response'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loadingOpening || sending || userTurnCount === 0}
            onClick={handleEndSession}
            leftIcon={<Flag className="h-4 w-4" />}
          >
            End Session & Get Feedback
          </Button>
        </div>
        {evalError && <ErrorState description={evalError} />}
      </form>
    </div>
  );
}

export default function PrepareSession() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-content w-full p-6 md:p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    }>
      <PrepareSessionContent />
    </Suspense>
  );
}
