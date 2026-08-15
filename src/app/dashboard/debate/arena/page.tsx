'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Bot, User, Send, Loader2, Trophy, Clock, Zap, ArrowLeft,
  Flag, AlertCircle, RefreshCcw, Sparkles, Brain, Heart, Swords,
  Scale, GraduationCap, Coffee, Landmark, Mic, MicOff, CheckCircle2,
  XCircle, Lightbulb, Star, Target, TrendingUp, MessageSquare,
  AlertTriangle, ChevronRight, Volume2, VolumeX, ListTree, Gauge, Share2, Languages,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import ShareTranscriptModal from '@/components/ShareTranscriptModal';

// Minimal typing for the Web Speech API (not in default TS lib.dom.d.ts)
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface DimensionScores {
  logic: number;
  facts: number;
  persuasiveness: number;
  confidence: number;
  communication: number;
  relevance: number;
}

interface Evaluation {
  scores: DimensionScores;
  overall: number;
  grade: string;
  winner: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  bestArgument: string;
  fallacies: string[];
  summary: string;
}

const PERSONALITY_ICONS: Record<string, any> = {
  Logical: Brain, Emotional: Heart, "Devil's Advocate": Swords, Neutral: Scale,
};
const STYLE_ICONS: Record<string, any> = {
  Formal: GraduationCap, Casual: Coffee, Oxford: Landmark, Parliamentary: Mic,
};

// Dimension colors stay distinct/colorful by design — this is the one place
// in the app where color-coded variety helps readers scan six numbers fast.
const DIMENSION_META: { key: keyof DimensionScores; label: string; icon: any; color: string }[] = [
  { key: 'logic',         label: 'Logic',          icon: Brain,          color: 'blue'    },
  { key: 'facts',         label: 'Facts',           icon: Target,         color: 'violet'  },
  { key: 'persuasiveness',label: 'Persuasiveness',  icon: TrendingUp,     color: 'amber'   },
  { key: 'confidence',    label: 'Confidence',      icon: Star,           color: 'emerald' },
  { key: 'communication', label: 'Communication',   icon: MessageSquare,  color: 'cyan'    },
  { key: 'relevance',     label: 'Relevance',       icon: Zap,            color: 'rose'    },
];

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500',
  emerald: 'bg-emerald-500', cyan: 'bg-cyan-500', rose: 'bg-rose-500',
};
const TEXT_COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-600', violet: 'text-violet-600', amber: 'text-amber-600',
  emerald: 'text-emerald-600', cyan: 'text-cyan-600', rose: 'text-rose-600',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function gradeClasses(grade: string): string {
  if (grade.startsWith('A')) return 'text-success border-success-border bg-success-subtle';
  if (grade.startsWith('B') || grade.startsWith('C')) return 'text-text border-border bg-surface-2';
  return 'text-danger border-danger-border bg-danger-subtle';
}

/** Presentational-only labeling of the existing message flow — no new data,
 *  just framing each turn as a step in the reasoning chain rather than a
 *  generic chat bubble. */
function turnLabel(role: 'user' | 'ai', index: number): string {
  if (role === 'ai') return index === 0 ? 'Opening Argument' : 'Counter-Argument';
  return 'Your Argument';
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-badge bg-border overflow-hidden">
      <div
        className={`h-full rounded-badge ${COLOR_MAP[color]} transition-all duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-surface-2 border border-border text-text-secondary mt-0.5">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-input border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Evaluation Results Panel (the "Conclusion" stage) ───────────────────────

function EvaluationResults({
  evaluation,
  duration,
  messages,
  topic,
  difficulty,
  debateStyle,
  aiPersonality,
  saving,
  onNewDebate,
  onViewHistory,
}: {
  evaluation: Evaluation;
  duration: number;
  messages: Message[];
  topic: string;
  difficulty: string;
  debateStyle: string;
  aiPersonality: string;
  saving: boolean;
  onNewDebate: () => void;
  onViewHistory: () => void;
}) {
  const [showShare, setShowShare] = useState(false);
  const gc = gradeClasses(evaluation.grade);
  const winnerTone = evaluation.winner === 'User' ? 'success' : evaluation.winner === 'AI' ? 'danger' : 'neutral';

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-4rem)] px-4 py-10 space-y-6 max-w-3xl mx-auto">
      {/* Hero header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-card bg-accent-subtle border border-accent-border mx-auto">
          <Trophy className="h-7 w-7 text-accent" />
        </div>
        <p className="text-caption text-accent uppercase">Conclusion</p>
        <h2 className="text-heading text-text">Debate Analysis</h2>
        <p className="text-text-secondary text-sm">Powered by Gemini AI · Honest · Detailed · Actionable</p>
      </div>

      {/* Winner + Grade + Overall */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={`p-5 text-center ${winnerTone === 'success' ? 'border-success-border bg-success-subtle' : winnerTone === 'danger' ? 'border-danger-border bg-danger-subtle' : ''}`}>
          <div className={`text-2xl font-bold mb-1 ${winnerTone === 'success' ? 'text-success' : winnerTone === 'danger' ? 'text-danger' : 'text-text'}`}>
            {evaluation.winner === 'User' ? 'Won' : evaluation.winner === 'AI' ? 'Lost' : 'Draw'}
          </div>
          <div className="text-caption text-text-secondary">Result</div>
        </Card>

        <div className={`rounded-card border p-5 text-center ${gc}`}>
          <div className="text-4xl font-bold">{evaluation.grade}</div>
          <div className="text-caption mt-1 opacity-80">Grade</div>
        </div>

        <Card className="p-5 text-center">
          <div className="text-4xl font-bold text-text">{evaluation.overall}</div>
          <div className="text-caption text-text-secondary mt-1">/ 100 Score</div>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Duration', value: formatDuration(duration), icon: Clock },
          { label: 'Your Turns', value: messages.filter(m => m.role === 'user').length, icon: MessageSquare },
          { label: 'Exchanges', value: Math.floor(messages.length / 2), icon: Zap },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4 text-center">
              <Icon className="h-4 w-4 text-text-muted mx-auto mb-2" />
              <div className="text-lg font-semibold text-text">{s.value}</div>
              <div className="text-caption text-text-muted">{s.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Dimension Scores */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <Target className="h-4 w-4 text-text-secondary" /> Performance Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIMENSION_META.map(dim => {
            const score = evaluation.scores[dim.key];
            const Icon = dim.icon;
            return (
              <div key={dim.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${TEXT_COLOR_MAP[dim.color]}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {dim.label}
                  </span>
                  <span className="text-xs font-bold text-text">{score}%</span>
                </div>
                <ScoreBar value={score} color={dim.color} />
              </div>
            );
          })}
        </div>
      </Card>

      {evaluation.summary && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-text">AI Judge Summary</h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{evaluation.summary}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-card border border-success-border bg-success-subtle p-5 space-y-3">
          <h3 className="text-sm font-semibold text-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Strengths
          </h3>
          <ul className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <ChevronRight className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-danger-border bg-danger-subtle p-5 space-y-3">
          <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Weaknesses
          </h3>
          <ul className="space-y-2">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <ChevronRight className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {evaluation.bestArgument && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-text-secondary" />
            <h3 className="text-sm font-semibold text-text">Your Best Argument</h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed italic">&quot;{evaluation.bestArgument}&quot;</p>
        </Card>
      )}

      {evaluation.suggestions.length > 0 && (
        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-text-secondary" /> Suggestions for Improvement
          </h3>
          <ul className="space-y-2">
            {evaluation.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-text-secondary font-bold shrink-0 text-xs mt-0.5">{i + 1}.</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {evaluation.fallacies.length > 0 && (
        <div className="rounded-card border border-warning-border bg-warning-subtle p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#92400E] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Logical Fallacies Detected
          </h3>
          <ul className="space-y-2">
            {evaluation.fallacies.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <ChevronRight className="h-3.5 w-3.5 text-[#92400E] mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[`${topic.length > 45 ? topic.slice(0, 45) + '…' : topic}`,
          `${difficulty}`, `${debateStyle}`, `${aiPersonality}`].map(tag => (
          <Badge key={tag} tone="neutral">{tag}</Badge>
        ))}
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving to your history…
        </div>
      )}

      {/* Share Transcript button */}
      <button
        id="share-transcript-btn"
        onClick={() => setShowShare(true)}
        className="w-full flex items-center justify-center gap-2 rounded-input border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-text hover:bg-surface hover:border-border-strong transition-all duration-150"
      >
        <Share2 className="h-4 w-4" /> Share Transcript
      </button>

      <div className="flex gap-3 pb-8">
        <Button onClick={onNewDebate} fullWidth leftIcon={<Zap className="h-4 w-4" />}>
          New Debate
        </Button>
        <Button onClick={onViewHistory} variant="secondary" fullWidth leftIcon={<Trophy className="h-4 w-4" />}>
          View History
        </Button>
      </div>

      {/* Share Transcript Modal */}
      {showShare && (
        <ShareTranscriptModal
          messages={messages}
          meta={{
            topic,
            difficulty,
            debateStyle,
            aiPersonality,
            score: evaluation.overall,
            grade: evaluation.grade,
            winner: evaluation.winner,
            duration,
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ─── Evaluating Loader ────────────────────────────────────────────────────────

function EvaluatingLoader({ onRetry }: { onRetry?: () => void }) {
  const steps = [
    'Analysing argument logic…',
    'Checking facts and evidence…',
    'Measuring persuasiveness…',
    'Detecting logical fallacies…',
    'Composing final verdict…',
  ];
  const [step, setStep] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % steps.length), 1400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowRetry(true), 45000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="h-16 w-16 rounded-card bg-accent-subtle border border-accent-border flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-accent animate-pulse" />
        </div>
        <div>
          <h2 className="text-subheading text-text">Gemini is judging…</h2>
          <p className="text-sm text-text-secondary mt-2 h-5 transition-all">{steps[step]}</p>
          <p className="text-xs text-text-muted mt-1">This may take up to 30 seconds</p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-1 w-8 rounded-badge bg-border overflow-hidden">
              <div className="h-full bg-accent rounded-badge animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            </div>
          ))}
        </div>
        {showRetry && onRetry && (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">Taking longer than expected (quota may be busy)</p>
            <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RefreshCcw className="h-4 w-4" />}>
              Retry Evaluation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Arena Component ─────────────────────────────────────────────────────

function DebateArenaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const topic = searchParams.get('topic') || 'Is AI a threat to humanity?';
  const difficulty = searchParams.get('difficulty') || 'Intermediate';
  const debateStyle = searchParams.get('debateStyle') || 'Formal';
  const aiPersonality = searchParams.get('aiPersonality') || 'Logical';
  const userStance = (searchParams.get('userStance') || 'FOR') as 'FOR' | 'AGAINST';
  const aiStance = userStance === 'FOR' ? 'AGAINST' : 'FOR';
  // Language ArgueBot should argue in (defaults to English)
  const language = searchParams.get('language') || 'English';
  // Knowledge Base: read the toggle param set by the debate setup page
  const useKnowledgeBase = searchParams.get('useKb') === '1';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // userId resolved once at mount; used for KB retrieval
  const userIdRef = useRef<string>('');

  // Voice: mic input (speech-to-text)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  // Voice: AI voice output (text-to-speech)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef(''); // text already in the box before the current listening session

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(d => d + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Stop timer on end
  useEffect(() => {
    if ((isEnded || isEvaluating) && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [isEnded, isEvaluating]);

  // Feature-detect Web Speech APIs (browser-only, no new dependencies)
  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0].transcript;
          else interimTranscript += result[0].transcript;
        }
        if (finalTranscript) baseInputRef.current = `${baseInputRef.current}${finalTranscript} `.trimStart();
        setInput(`${baseInputRef.current}${interimTranscript}`);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      setSpeechSupported(true);
    }

    if ('speechSynthesis' in window) setTtsSupported(true);

    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      window.speechSynthesis?.cancel(); // don't listen while ArgueBot is talking
      setIsSpeaking(false);
      baseInputRef.current = input ? `${input} ` : '';
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, input]);

  const speak = useCallback((text: string) => {
    if (!ttsSupported || !voiceOutputEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, voiceOutputEnabled]);

  // Resolve userId once (used for KB retrieval and debate saving)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user?.id || 'demo-user-id';
    });
  }, []);

  // Opening argument
  useEffect(() => {
    async function startDebate() {
      try {
        const res = await fetch('/api/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic, difficulty, debateStyle, aiPersonality, language,
            messages: [], isOpening: true, userStance,
            useKnowledgeBase,
            userId: userIdRef.current,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to start debate');
        }
        const data = await res.json();
        setMessages([{ role: 'ai', content: data.message, timestamp: new Date() }]);
        speak(data.message);
      } catch (err: any) {
        setError(err.message || 'Failed to start debate. Please try again.');
      } finally {
        setIsStarting(false);
      }
    }
    startDebate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!input.trim() || loading || isEnded) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const userMessage: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    baseInputRef.current = '';
    setLoading(true);
    setError(null);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, difficulty, debateStyle, aiPersonality, language,
          messages: apiMessages, isOpening: false, userStance,
          useKnowledgeBase,
          userId: userIdRef.current,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to get AI response');
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.message, timestamp: new Date() }]);
      speak(data.message);
    } catch (err: any) {
      setError(err.message || 'Failed to get a response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const endDebate = async () => {
    if (messages.length < 3) {
      setError('The debate needs at least 2 exchanges before you can end it.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    window.speechSynthesis?.cancel();
    setIsEnded(true);
    setIsEvaluating(true);

    let evalResult: Evaluation | null = null;

    try {
      const apiMessages = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, messages: apiMessages, userStance, difficulty, debateStyle, aiPersonality, language }),
      });
      if (res.ok) {
        const data = await res.json();
        evalResult = data.evaluation;
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Evaluation failed');
      }
    } catch (err: any) {
      const userMessages = messages.filter(m => m.role === 'user');
      const avgLen = userMessages.reduce((s, m) => s + m.content.length, 0) / Math.max(userMessages.length, 1);
      const overall = Math.min(90, Math.max(40, Math.round(50 + (avgLen / 50) * 15 + userMessages.length * 2)));
      evalResult = {
        scores: { logic: overall, facts: overall - 5, persuasiveness: overall + 3, confidence: overall - 2, communication: overall + 5, relevance: overall },
        overall,
        grade: overall >= 85 ? 'A' : overall >= 75 ? 'B' : overall >= 65 ? 'C' : 'D',
        winner: 'Draw',
        strengths: ['Engaged consistently with the topic', 'Showed clear stance'],
        weaknesses: ['Could use more supporting evidence'],
        suggestions: ['Back claims with specific data', 'Address opponent points directly'],
        bestArgument: userMessages[userMessages.length - 1]?.content?.slice(0, 120) || '',
        fallacies: [],
        summary: 'Evaluation could not be loaded from Gemini. Showing estimated results.',
      };
      setError('Note: AI evaluation unavailable — showing estimated results.');
    } finally {
      setIsEvaluating(false);
    }

    if (evalResult) {
      setEvaluation(evalResult);

      setSaving(true);
      try {
        const userId = userIdRef.current || 'demo-user-id';
        await fetch('/api/debates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            winner: evalResult.winner,
            score: evalResult.overall,
            duration: durationRef.current,
            difficulty,
            debateStyle,
            aiPersonality,
            userId,
            evaluation: evalResult,
          }),
        });
      } catch (err) {
        console.error('Failed to save debate:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  const PersonalityIcon = PERSONALITY_ICONS[aiPersonality] || Bot;
  const StyleIcon = STYLE_ICONS[debateStyle] || GraduationCap;

  if (isStarting) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="h-16 w-16 rounded-card bg-accent-subtle border border-accent-border flex items-center justify-center animate-pulse">
            <Bot className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h2 className="text-subheading text-text">Setting up the debate floor…</h2>
            <p className="text-sm text-text-secondary mt-2">ArgueBot is preparing its opening argument</p>
            <p className="text-sm font-semibold text-text mt-1 italic">&quot;{topic}&quot;</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-1 w-8 rounded-badge bg-border overflow-hidden">
                <div className="h-full bg-accent rounded-badge animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isEvaluating) return <EvaluatingLoader onRetry={() => {
    setIsEvaluating(false);
    setIsEnded(false);
    setTimeout(() => endDebate(), 100);
  }} />;

  if (evaluation) {
    return (
      <EvaluationResults
        evaluation={evaluation}
        duration={durationRef.current}
        messages={messages}
        topic={topic}
        difficulty={difficulty}
        debateStyle={debateStyle}
        aiPersonality={aiPersonality}
        saving={saving}
        onNewDebate={() => router.push('/dashboard/debate')}
        onViewHistory={() => router.push('/dashboard/history')}
      />
    );
  }

  const turnsRemaining = Math.max(0, 3 - messages.length);
  const yourTurns = messages.filter(m => m.role === 'user').length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar — kept full-width and always-visible so every control
          (back, mode badges, voice, timer, end) works at any screen size. */}
      <div className={`shrink-0 border-b border-border bg-surface px-4 md:px-6 py-3 transition-shadow duration-150 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="flex items-center gap-3 max-w-workspace mx-auto">
          <button
            onClick={() => router.push('/dashboard/debate')}
            className="rounded-[8px] p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge tone="neutral"><PersonalityIcon className="h-3 w-3" />{aiPersonality}</Badge>
              <Badge tone="neutral"><StyleIcon className="h-3 w-3" />{debateStyle}</Badge>
              <Badge tone={difficulty === 'Advanced' ? 'danger' : difficulty === 'Intermediate' ? 'neutral' : 'success'}>{difficulty}</Badge>
              <Badge tone={userStance === 'FOR' ? 'success' : 'danger'}>You: {userStance}</Badge>
              {language !== 'English' && <Badge tone="accent"><Languages className="h-3 w-3" />{language}</Badge>}
            </div>
            <p className="text-xs text-text-muted truncate mt-1 max-w-md">{topic}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ttsSupported && (
              <button
                onClick={() => {
                  const next = !voiceOutputEnabled;
                  setVoiceOutputEnabled(next);
                  if (!next) { window.speechSynthesis?.cancel(); setIsSpeaking(false); }
                }}
                title={voiceOutputEnabled ? 'Turn off ArgueBot voice' : 'Turn on ArgueBot voice'}
                className={`flex items-center gap-1.5 rounded-input border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                  voiceOutputEnabled
                    ? 'border-transparent bg-text text-text-inverse'
                    : 'border-border bg-surface-2 text-text-muted hover:text-text-secondary'
                }`}
              >
                {voiceOutputEnabled
                  ? <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-input border border-border bg-surface-2 px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs font-mono text-text-secondary">{formatDuration(duration)}</span>
            </div>
            <button
              onClick={endDebate}
              disabled={isEnded || messages.length < 3}
              className="flex items-center gap-1.5 rounded-input border border-danger-border bg-danger-subtle px-3 py-1.5 text-xs font-semibold text-danger hover:brightness-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Flag className="h-3.5 w-3.5" /> End
            </button>
          </div>
        </div>
      </div>

      {/* 3-column workspace: session outline · structured reasoning feed · quick actions */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] max-w-workspace w-full mx-auto">

        {/* LEFT — session context & turn outline */}
        <aside className="hidden lg:flex flex-col gap-5 border-r border-border bg-surface-2/40 overflow-y-auto p-5">
          <div>
            <p className="text-caption text-text-muted uppercase mb-2">Motion</p>
            <p className="text-sm text-text leading-snug">{topic}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-input border border-border bg-surface p-3">
              <p className="text-caption text-text-muted">You</p>
              <p className={`text-sm font-bold ${userStance === 'FOR' ? 'text-success' : 'text-danger'}`}>{userStance}</p>
            </div>
            <div className="rounded-input border border-border bg-surface p-3">
              <p className="text-caption text-text-muted">ArgueBot</p>
              <p className={`text-sm font-bold ${aiStance === 'FOR' ? 'text-success' : 'text-danger'}`}>{aiStance}</p>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <p className="text-caption text-text-muted uppercase mb-2 flex items-center gap-1.5">
              <ListTree className="h-3 w-3" /> Turn outline
            </p>
            <div className="space-y-1">
              {messages.map((m, i) => (
                <button
                  key={i}
                  onClick={() => messagesEndRef.current?.parentElement?.querySelector(`[data-turn="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="w-full text-left rounded-[8px] px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-2 hover:text-text transition-colors duration-150 truncate"
                >
                  {i + 1}. {turnLabel(m.role, i)}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER — structured reasoning feed */}
        <div className="flex flex-col min-w-0 min-h-0">
          <div
            ref={chatContainerRef}
            onScroll={() => setScrolled((chatContainerRef.current?.scrollTop || 0) > 20)}
            className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5 debate-chat"
          >
            {messages.map((message, i) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={i}
                  data-turn={i}
                  className={`rounded-card border bg-surface p-5 max-w-prose-comfortable ${
                    isUser ? 'border-l-2 border-l-accent ml-auto' : 'border-l-2 border-l-border-strong mr-auto'
                  } border-border`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className={`flex items-center gap-1.5 text-caption font-semibold ${isUser ? 'text-accent' : 'text-text-secondary'}`}>
                      {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      {turnLabel(message.role, i)}
                      {!isUser && <span className="text-text-muted font-normal">· {aiPersonality}</span>}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-body text-text">
                    {message.content.split('\n').map((para, j) =>
                      para.trim() ? <p key={j} className={j > 0 ? 'mt-3' : ''}>{para}</p> : null
                    )}
                  </div>
                </div>
              );
            })}

            {loading && <TypingIndicator />}

            {error && (
              <div className="flex items-start gap-3 rounded-input border border-danger-border bg-danger-subtle px-4 py-3 max-w-lg">
                <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-danger">{error}</p>
                  <button onClick={() => setError(null)} className="mt-1 flex items-center gap-1 text-xs text-danger/80 hover:text-danger transition-colors duration-150">
                    <RefreshCcw className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length > 0 && messages.length < 3 && (
            <div className="shrink-0 px-4 py-1.5 text-center">
              <span className="text-[10px] text-text-muted">
                Engage at least {3 - messages.length} more time{3 - messages.length !== 1 ? 's' : ''} before ending
              </span>
            </div>
          )}

          {/* Sticky input */}
          <div className="shrink-0 border-t border-border bg-surface p-4">
            {isEnded ? (
              <div className="text-center py-2">
                <p className="text-sm text-text-secondary">Debate ended. Scroll up to view results.</p>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Present your argument ${userStance === 'FOR' ? 'for' : 'against'} the motion… (Enter to send, Shift+Enter for new line)`}
                    disabled={loading || isStarting}
                    rows={3}
                    className="w-full resize-none rounded-input border border-border bg-surface px-4 py-3 pr-16 text-sm text-text placeholder-text-muted outline-none focus:border-accent transition-colors duration-150 disabled:opacity-50"
                    style={{ maxHeight: '150px', scrollbarWidth: 'thin' }}
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-text-muted">
                    {input.length > 0 && `${input.length} chars`}
                  </div>
                </div>
                {speechSupported && (
                  <button
                    onClick={toggleListening}
                    disabled={loading || isStarting}
                    title={isListening ? 'Stop recording' : 'Speak your argument'}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-input border transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${
                      isListening
                        ? 'border-danger-border bg-danger-subtle text-danger animate-pulse'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || isEnded}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-input bg-accent text-text-inverse hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — live session signal + quick actions (full AI confidence
            breakdown only exists after evaluation, so this stays honest
            about what's known mid-debate rather than faking a live score). */}
        <aside className="hidden lg:flex flex-col gap-5 border-l border-border bg-surface-2/40 overflow-y-auto p-5">
          <div>
            <p className="text-caption text-text-muted uppercase mb-2 flex items-center gap-1.5">
              <Gauge className="h-3 w-3" /> Session
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Your turns</span>
                <span className="font-semibold text-text">{yourTurns}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Time elapsed</span>
                <span className="font-semibold text-text font-mono">{formatDuration(duration)}</span>
              </div>
              {turnsRemaining > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Turns to unlock End</span>
                  <span className="font-semibold text-text">{turnsRemaining}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-input border border-accent-border bg-accent-subtle p-3.5">
            <p className="text-caption text-accent-hover mb-1">AI Confidence</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Full performance scoring (logic, facts, persuasiveness, and more) is generated once you end the debate.
            </p>
          </div>

          <div>
            <p className="text-caption text-text-muted uppercase mb-2">Quick tip</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Address ArgueBot&apos;s last point directly before introducing a new one — rebuttals that engage the opponent&apos;s claim score higher than parallel arguments.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function DebateArena() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    }>
      <DebateArenaContent />
    </Suspense>
  );
}
