'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  History, Calendar, Clock, Trophy, Bot, Zap, Brain, Heart,
  Swords, Scale, GraduationCap, Coffee, Landmark, Mic, Loader2,
  Plus, X, MessageSquare, Target, Star, CheckCircle2,
  XCircle, Lightbulb, AlertTriangle, ChevronRight, User, BarChart2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function gradeTone(grade: string): 'neutral' | 'success' | 'danger' {
  if (!grade) return 'neutral';
  if (grade.startsWith('A')) return 'success';
  if (grade.startsWith('B') || grade.startsWith('C')) return 'neutral';
  return 'danger';
}

function winnerTone(winner: string): 'success' | 'danger' | 'neutral' {
  if (winner === 'User') return 'success';
  if (winner === 'AI') return 'danger';
  return 'neutral';
}

const PERSONALITY_ICONS: Record<string, any> = {
  Logical: Brain, Emotional: Heart, "Devil's Advocate": Swords, Neutral: Scale,
};
const STYLE_ICONS: Record<string, any> = {
  Formal: GraduationCap, Casual: Coffee, Oxford: Landmark, Parliamentary: Mic,
};

// Dimension colors are kept intentionally distinct (not tokenized to one
// accent) so the performance breakdown is scannable at a glance.
const DIMENSION_KEYS = ['logic', 'facts', 'persuasiveness', 'confidence', 'communication', 'relevance'] as const;
const DIMENSION_LABELS: Record<string, string> = {
  logic: 'Logic', facts: 'Facts', persuasiveness: 'Persuasiveness',
  confidence: 'Confidence', communication: 'Communication', relevance: 'Relevance',
};
const DIMENSION_COLORS: Record<string, string> = {
  logic: 'bg-blue-500', facts: 'bg-violet-500', persuasiveness: 'bg-amber-500',
  confidence: 'bg-emerald-500', communication: 'bg-cyan-500', relevance: 'bg-rose-500',
};
const DIMENSION_TEXT_COLORS: Record<string, string> = {
  logic: 'text-blue-600', facts: 'text-violet-600', persuasiveness: 'text-amber-600',
  confidence: 'text-emerald-600', communication: 'text-cyan-600', relevance: 'text-rose-600',
};

// ─── Replay Modal ─────────────────────────────────────────────────────────────

function ReplayModal({ debate, onClose }: { debate: any; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'transcript' | 'analysis'>('transcript');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/debates?debateId=${debate.id}`);
        const data = await res.json();
        setMessages(data.messages || []);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [debate.id]);

  const hasAnalysis = debate.summary || debate.strengths?.length;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-text/40 animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-card border border-border bg-surface shadow-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-caption text-text-muted mb-1">
                {new Date(debate.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {debate.duration ? ` · ${formatDuration(debate.duration)}` : ''}
              </p>
              <h2 className="text-sm font-bold text-text line-clamp-2">{debate.topic}</h2>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {debate.winner && (
                  <Badge tone={winnerTone(debate.winner)}>
                    {debate.winner === 'User' ? 'Won' : debate.winner === 'AI' ? 'Lost' : 'Draw'}
                  </Badge>
                )}
                {debate.grade && <Badge tone={gradeTone(debate.grade)}>Grade {debate.grade}</Badge>}
                {debate.score != null && <Badge tone="neutral">{debate.score}/100</Badge>}
              </div>
            </div>
            <button onClick={onClose} className="rounded-[8px] p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text transition-colors duration-150 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'transcript' | 'analysis')} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            </div>
          ) : tab === 'transcript' ? (
            messages.length === 0 ? (
              <p className="text-center text-sm text-text-secondary py-8">Transcript not available for this debate.</p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role !== 'user' ? 'bg-surface-2 border border-border text-text-secondary' : 'bg-text text-text-inverse'
                  }`}>
                    {msg.role !== 'user' ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`rounded-input px-4 py-3 text-sm leading-relaxed ${
                    msg.role !== 'user'
                      ? 'bg-surface-2 border border-border text-text rounded-bl-sm'
                      : 'bg-text text-text-inverse rounded-br-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="space-y-4">
              {DIMENSION_KEYS.some(k => debate[`score_${k}`] != null) && (
                <div className="rounded-input border border-border bg-surface-2 p-4 space-y-3">
                  <h3 className="text-xs font-bold text-text flex items-center gap-1.5">
                    <BarChart2 className="h-3.5 w-3.5 text-text-secondary" /> Performance Breakdown
                  </h3>
                  {DIMENSION_KEYS.map(k => {
                    const val = debate[`score_${k}`];
                    if (val == null) return null;
                    return (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={`font-medium ${DIMENSION_TEXT_COLORS[k]}`}>{DIMENSION_LABELS[k]}</span>
                          <span className="text-text font-bold">{val}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-badge bg-border overflow-hidden">
                          <div className={`h-full rounded-badge ${DIMENSION_COLORS[k]}`} style={{ width: `${val}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {debate.summary && (
                <div className="rounded-input border border-border bg-surface-2 p-4">
                  <p className="text-xs font-bold text-text mb-2 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Summary</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{debate.summary}</p>
                </div>
              )}

              {debate.strengths?.length > 0 && (
                <div className="rounded-input border border-success-border bg-success-subtle p-4 space-y-2">
                  <p className="text-xs font-bold text-success flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Strengths</p>
                  {debate.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-success mt-0.5 shrink-0" />{s}
                    </p>
                  ))}
                </div>
              )}

              {debate.weaknesses?.length > 0 && (
                <div className="rounded-input border border-danger-border bg-danger-subtle p-4 space-y-2">
                  <p className="text-xs font-bold text-danger flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Weaknesses</p>
                  {debate.weaknesses.map((w: string, i: number) => (
                    <p key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-danger mt-0.5 shrink-0" />{w}
                    </p>
                  ))}
                </div>
              )}

              {debate.best_argument && (
                <div className="rounded-input border border-border bg-surface-2 p-4">
                  <p className="text-xs font-bold text-text mb-2 flex items-center gap-1.5"><Star className="h-3 w-3" /> Best Argument</p>
                  <p className="text-sm text-text-secondary italic">&quot;{debate.best_argument}&quot;</p>
                </div>
              )}

              {debate.suggestions?.length > 0 && (
                <div className="rounded-input border border-border bg-surface p-4 space-y-2">
                  <p className="text-xs font-bold text-text flex items-center gap-1.5"><Lightbulb className="h-3 w-3 text-text-secondary" /> Suggestions</p>
                  {debate.suggestions.map((s: string, i: number) => (
                    <p key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <span className="text-text-secondary font-bold text-xs shrink-0">{i + 1}.</span>{s}
                    </p>
                  ))}
                </div>
              )}

              {debate.fallacies?.length > 0 && (
                <div className="rounded-input border border-warning-border bg-warning-subtle p-4 space-y-2">
                  <p className="text-xs font-bold text-[#92400E] flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Fallacies Detected</p>
                  {debate.fallacies.map((f: string, i: number) => (
                    <p key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-[#92400E] mt-0.5 shrink-0" />{f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main History Page ────────────────────────────────────────────────────────

export default function DebateHistory() {
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'demo-user-id';
        const res = await fetch(`/api/debates?userId=${userId}`);
        const data = await res.json();
        setDebates(data.debates || []);
      } catch (err) {
        console.error('Error fetching debate history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const wins = debates.filter(d => d.winner === 'User').length;
  const totalSecs = debates.reduce((s, d) => s + (d.duration || 0), 0);
  const avgScore = debates.length
    ? Math.round(debates.reduce((s, d) => s + (d.score || 0), 0) / debates.length)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          <p className="text-sm text-text-secondary">Loading your debates…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {selected && <ReplayModal debate={selected} onClose={() => setSelected(null)} />}

      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading text-text">Debate History</h1>
            <p className="text-body text-text-secondary mt-1">Review your past debates, scores, and AI analysis.</p>
          </div>
          <Link href="/dashboard/debate">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Debate</Button>
          </Link>
        </div>

        {debates.length === 0 ? (
          <EmptyState
            icon={<History className="h-5 w-5" />}
            title="No debates yet"
            description="Start your first debate to build your history and track improvement."
            action={
              <Link href="/dashboard/debate">
                <Button leftIcon={<Zap className="h-4 w-4" />}>Start First Debate</Button>
              </Link>
            }
            className="max-w-2xl"
          />
        ) : (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Debates', value: debates.length, icon: History },
                { label: 'Wins', value: wins, icon: Trophy },
                { label: 'Avg Score', value: `${avgScore}`, icon: Target },
                { label: 'Total Time', value: formatDuration(totalSecs), icon: Clock },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-5">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-text-secondary mb-3">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-semibold text-text">{stat.value}</div>
                    <div className="text-caption text-text-muted mt-0.5">{stat.label}</div>
                  </Card>
                );
              })}
            </div>

            {/* Win rate bar */}
            <Card className="p-5">
              <div className="flex justify-between text-caption text-text-secondary mb-2">
                <span>Win Rate</span>
                <span className="font-semibold text-text">{Math.round((wins / debates.length) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-badge bg-border overflow-hidden">
                <div
                  className="h-full rounded-badge bg-success transition-all duration-700 ease-out"
                  style={{ width: `${Math.round((wins / debates.length) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
                <span>{wins} wins</span>
                <span>{debates.filter(d => d.winner === 'Draw').length} draws</span>
                <span>{debates.filter(d => d.winner === 'AI').length} losses</span>
              </div>
            </Card>

            {/* Debate cards */}
            <div className="space-y-3">
              <h2 className="text-caption text-text-secondary uppercase">Past Debates</h2>
              {debates.map(debate => {
                const PersonalityIcon = PERSONALITY_ICONS[debate.ai_personality] || Bot;
                const StyleIcon = STYLE_ICONS[debate.debate_style] || GraduationCap;

                return (
                  <button
                    key={debate.id}
                    onClick={() => setSelected(debate)}
                    className="w-full text-left rounded-card border border-border bg-surface p-5 hover:border-border-strong transition-colors duration-150 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {debate.winner && <Badge tone={winnerTone(debate.winner)}>{debate.winner === 'User' ? 'Won' : debate.winner === 'AI' ? 'Lost' : 'Draw'}</Badge>}
                          {debate.grade && <Badge tone={gradeTone(debate.grade)}>{debate.grade}</Badge>}
                          <Badge tone={debate.difficulty === 'Advanced' ? 'danger' : debate.difficulty === 'Intermediate' ? 'neutral' : 'success'}>
                            {debate.difficulty}
                          </Badge>
                          {debate.debate_style && (
                            <Badge tone="neutral"><StyleIcon className="h-2.5 w-2.5" />{debate.debate_style}</Badge>
                          )}
                          {debate.ai_personality && (
                            <Badge tone="neutral"><PersonalityIcon className="h-2.5 w-2.5" />{debate.ai_personality}</Badge>
                          )}
                        </div>

                        <p className="text-sm font-bold text-text leading-tight">{debate.topic}</p>

                        {debate.summary && (
                          <p className="text-xs text-text-secondary line-clamp-1">{debate.summary}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(debate.created_at).toLocaleDateString()}
                          </span>
                          {debate.duration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{formatDuration(debate.duration)}
                            </span>
                          )}
                          {debate.message_count > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />{debate.message_count} messages
                            </span>
                          )}
                        </div>
                      </div>

                      {debate.score != null && (
                        <div className={`shrink-0 text-center rounded-input border px-4 py-3 ${
                          debate.score >= 75 ? 'border-success-border bg-success-subtle' : 'border-border bg-surface-2'
                        }`}>
                          <div className={`text-2xl font-bold ${debate.score >= 75 ? 'text-success' : 'text-text'}`}>
                            {debate.score}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">Score</div>
                        </div>
                      )}
                    </div>

                    {DIMENSION_KEYS.some(k => debate[`score_${k}`] != null) && (
                      <div className="mt-4 grid grid-cols-6 gap-1.5">
                        {DIMENSION_KEYS.map(k => {
                          const val = debate[`score_${k}`];
                          if (val == null) return null;
                          return (
                            <div key={k} title={`${DIMENSION_LABELS[k]}: ${val}`} className="space-y-1">
                              <div className="h-1 rounded-badge bg-border overflow-hidden">
                                <div className={`h-full rounded-badge ${DIMENSION_COLORS[k]}`} style={{ width: `${val}%` }} />
                              </div>
                              <p className="text-[9px] text-text-muted text-center">{DIMENSION_LABELS[k].slice(0, 4)}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[10px] text-text-muted group-hover:text-accent transition-colors duration-150 mt-3 text-right">
                      Click to review →
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
