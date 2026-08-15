'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, GraduationCap, Coffee, Landmark, Mic, ArrowRight, Sparkles,
  Link2, LogIn, Minus, Plus as PlusIcon,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea, FieldLabel } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase/client';
import { getGuestId } from '@/lib/rooms/guestIdentity';

const DEBATE_STYLES = [
  { id: 'Formal', icon: GraduationCap, label: 'Formal' },
  { id: 'Casual', icon: Coffee, label: 'Casual' },
  { id: 'Oxford', icon: Landmark, label: 'Oxford' },
  { id: 'Parliamentary', icon: Mic, label: 'Parliamentary' },
];

const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner' },
  { id: 'Intermediate', label: 'Intermediate' },
  { id: 'Advanced', label: 'Advanced' },
];

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-caption text-text-secondary uppercase">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-text text-text-inverse text-[10px] font-bold">{n}</span>
      {children}
    </label>
  );
}

const selectableCard = (isSelected: boolean) =>
  `text-left rounded-input border p-4 transition-colors duration-150 ${
    isSelected ? 'border-accent bg-accent-subtle' : 'border-border bg-surface text-text-secondary hover:border-border-strong'
  }`;

export default function NewGroupDebate() {
  const router = useRouter();

  const [hostName, setHostName] = useState('');
  const [topic, setTopic] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [debateStyle, setDebateStyle] = useState('Formal');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    async function loadName() {
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0];
      if (name) setHostName(name);
    }
    loadName();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError('Please enter a debate topic.');
      return;
    }
    if (!hostName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId: getGuestId(),
          hostName: hostName.trim(),
          topic: topic.trim(),
          debateStyle,
          difficulty,
          maxParticipants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to create the room.');
        return;
      }
      router.push(`/dashboard/rooms/${data.room.code}`);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/dashboard/rooms/${code}`);
  };

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-accent" />
          <span className="text-caption text-text-secondary uppercase">Group Debate</span>
        </div>
        <h1 className="text-heading text-text">Start a multi-person debate</h1>
        <p className="text-body text-text-secondary mt-1">
          Set up a room, share the code, and debate live with 2–6 people. An AI Moderator runs the rounds and an AI Judge scores everyone at the end.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleCreate} className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <StepLabel n={1}>Your Display Name</StepLabel>
            <Input
              required
              placeholder="e.g. Alex"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              maxLength={40}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <StepLabel n={2}>Debate Topic</StepLabel>
            <Textarea
              required
              rows={3}
              placeholder="e.g. Should social media platforms be regulated like public utilities?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <StepLabel n={3}>Participants</StepLabel>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMaxParticipants((n) => Math.max(2, n - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-input border border-border bg-surface text-text-secondary hover:border-border-strong disabled:opacity-40"
                disabled={maxParticipants <= 2}
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-semibold text-text">{maxParticipants}</span>
                <p className="text-caption text-text-secondary">people (2–6)</p>
              </div>
              <button
                type="button"
                onClick={() => setMaxParticipants((n) => Math.min(6, n + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-input border border-border bg-surface text-text-secondary hover:border-border-strong disabled:opacity-40"
                disabled={maxParticipants >= 6}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <StepLabel n={4}>Debate Style</StepLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {DEBATE_STYLES.map((style) => {
                const Icon = style.icon;
                const isSelected = debateStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setDebateStyle(style.id)}
                    className={`${selectableCard(isSelected)} flex flex-col items-center gap-2 text-center`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                    <p className="text-xs font-semibold text-text">{style.label}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <StepLabel n={5}>Difficulty</StepLabel>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map((diff) => {
                const isSelected = difficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    type="button"
                    onClick={() => setDifficulty(diff.id)}
                    className={`${selectableCard(isSelected)} text-center`}
                  >
                    <p className="text-xs font-semibold text-text">{diff.label}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {error && <ErrorState description={error} />}

          <Button type="submit" size="lg" fullWidth loading={submitting} rightIcon={!submitting ? <ArrowRight className="h-4 w-4" /> : undefined} leftIcon={!submitting ? <Sparkles className="h-4 w-4" /> : undefined}>
            {submitting ? 'Creating room…' : 'Create Room'}
          </Button>
        </form>

        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text">Have a room code?</h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Ask the host for their 6-character code and jump straight into the lobby.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <FieldLabel>Room Code</FieldLabel>
              <Input
                placeholder="e.g. K7QX2M"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="tracking-[0.2em] font-mono uppercase"
              />
              <Button type="submit" variant="secondary" fullWidth leftIcon={<LogIn className="h-4 w-4" />} disabled={!joinCode.trim()}>
                Join Room
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
