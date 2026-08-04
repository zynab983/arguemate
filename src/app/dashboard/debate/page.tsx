'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  Coins,
  BookOpen,
  Globe2,
  Check,
  Plus,
  ArrowRight,
  Brain,
  Heart,
  Swords,
  Scale,
  Mic,
  Coffee,
  GraduationCap,
  Landmark,
  Flame,
  Bot,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';

const CATEGORIES = [
  { name: 'Technology', icon: Cpu },
  { name: 'Economics', icon: Coins },
  { name: 'Ethics & Philosophy', icon: BookOpen },
  { name: 'Global Politics', icon: Globe2 },
];

const PRESETS: Record<string, { title: string; description: string }[]> = {
  Technology: [
    {
      title: 'Is artificial intelligence a threat to human creativity?',
      description: 'Explore if AI generative tools dilute original human expression or expand creative boundaries.',
    },
    {
      title: 'Should social media platforms be held liable for user content?',
      description: 'Debate platform responsibility vs. free speech in the age of viral misinformation.',
    },
  ],
  Economics: [
    {
      title: 'Should universal basic income be implemented globally?',
      description: 'Debate the viability of paying all citizens a flat monthly stipend in the age of automation.',
    },
    {
      title: 'Is free trade always beneficial for developing nations?',
      description: 'Examine the economic consequences of open markets on emerging economies.',
    },
  ],
  'Ethics & Philosophy': [
    {
      title: 'Is space colonization an ethical priority for humanity?',
      description: 'Argue whether spending billions on Mars settlement is ethical while millions suffer on Earth.',
    },
    {
      title: 'Should gene editing of human embryos be permitted?',
      description: 'Debate the moral boundaries of designer babies and genetic engineering.',
    },
  ],
  'Global Politics': [
    {
      title: 'Should voting be made mandatory in democratic nations?',
      description: 'Debate if enforced civic duty improves democratic representation or violates individual liberties.',
    },
    {
      title: 'Should nuclear weapons be abolished worldwide?',
      description: 'Examine deterrence theory vs. humanitarian arguments for disarmament.',
    },
  ],
};

const DEBATE_STYLES = [
  { id: 'Formal', icon: GraduationCap, label: 'Formal', desc: 'Structured, academic arguments with formal transitions and sophisticated vocabulary.' },
  { id: 'Casual', icon: Coffee, label: 'Casual', desc: 'Conversational and approachable — relatable examples, friendly but substantive.' },
  { id: 'Oxford', icon: Landmark, label: 'Oxford', desc: 'Classic Oxford Union style — layered, literary, and rhetorically elegant.' },
  { id: 'Parliamentary', icon: Mic, label: 'Parliamentary', desc: 'Procedural debate with honorifics, points of information, and structured speeches.' },
];

const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner', desc: 'Simple, clear arguments. Encouraging tone. Great for learning.' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Moderate complexity. Academic concepts. Real challenge.' },
  { id: 'Advanced', label: 'Advanced', desc: 'Relentless, sophisticated arguments. Not for the faint-hearted.' },
];

const AI_PERSONALITIES = [
  { id: 'Logical', icon: Brain, label: 'Logical', desc: 'Pure data, statistics, and formal reasoning. No emotional appeals.' },
  { id: 'Emotional', icon: Heart, label: 'Emotional', desc: 'Vivid stories, human impact, and powerful moral intuition.' },
  { id: "Devil's Advocate", icon: Swords, label: "Devil's Advocate", desc: 'Argues the opposite of obvious. Exposes hidden weaknesses with vigor.' },
  { id: 'Neutral', icon: Scale, label: 'Neutral', desc: 'Balanced perspectives. Nuanced middle ground. Intellectual humility.' },
];

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-caption text-text-secondary uppercase">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-text text-text-inverse text-[10px] font-bold">{n}</span>
      {children}
    </label>
  );
}

export default function StartDebate() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState('Technology');
  const [topic, setTopic] = useState(PRESETS['Technology'][0].title);
  const [customTopic, setCustomTopic] = useState('');
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [stance, setStance] = useState<'FOR' | 'AGAINST'>('FOR');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [debateStyle, setDebateStyle] = useState('Formal');
  const [aiPersonality, setAiPersonality] = useState('Logical');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetSelect = (title: string, cat: string) => {
    setTopic(title);
    setSelectedCategory(cat);
    setUseCustomTopic(false);
  };

  const handleLaunchDebate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const finalTopic = useCustomTopic ? customTopic.trim() : topic;

    if (!finalTopic) {
      setError('Please select or enter a debate topic.');
      setSubmitting(false);
      return;
    }

    const params = new URLSearchParams({
      topic: finalTopic,
      stance,
      difficulty,
      style: debateStyle,
      personality: aiPersonality,
    });

    router.push(`/dashboard/debate/arena?${params.toString()}`);
  };

  const selectableCard = (isSelected: boolean) =>
    `text-left rounded-input border p-4 transition-colors duration-150 ${
      isSelected
        ? 'border-accent bg-accent-subtle'
        : 'border-border bg-surface text-text-secondary hover:border-border-strong'
    }`;

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-caption text-text-secondary uppercase">New Debate</span>
          </div>
          <h1 className="text-heading text-text">Configure your debate</h1>
          <p className="text-body text-text-secondary mt-1">Choose your topic, style, and AI opponent before entering the debate arena.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-input border border-border bg-surface px-4 py-2">
          <Bot className="h-4 w-4 text-text-secondary" />
          <span className="text-caption text-text-secondary">ArgueBot ready</span>
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        </div>
      </div>

      <form onSubmit={handleLaunchDebate} className="space-y-6">
        {/* Step 1: Category */}
        <Card className="p-6 space-y-4">
          <StepLabel n={1}>Choose Category</StepLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setTopic(PRESETS[cat.name][0].title);
                    setUseCustomTopic(false);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-input p-4 text-center border text-xs font-semibold transition-colors duration-150 ${
                    isSelected
                      ? 'border-accent bg-accent-subtle text-accent-hover'
                      : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Step 2: Topic */}
        <Card className="p-6 space-y-4">
          <StepLabel n={2}>Select Motion</StepLabel>
          <div className="space-y-3">
            {(PRESETS[selectedCategory] || []).map((preset) => {
              const isSelected = !useCustomTopic && topic === preset.title;
              return (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => handlePresetSelect(preset.title, selectedCategory)}
                  className={`w-full ${selectableCard(isSelected)} flex justify-between items-start gap-4`}
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-text">{preset.title}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">{preset.description}</p>
                  </div>
                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-text-inverse">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setUseCustomTopic(true)}
              className={`w-full ${selectableCard(useCustomTopic)} flex items-center gap-3`}
            >
              <Plus className="h-4 w-4 text-text-secondary shrink-0" />
              <span className="text-sm font-semibold text-text">Custom Topic</span>
              {useCustomTopic && (
                <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-text-inverse">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
            {useCustomTopic && (
              <Textarea
                required
                rows={3}
                placeholder="e.g. Should social media platforms be regulated like public utilities?"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
            )}
          </div>
        </Card>

        {/* Step 3: Stance */}
        <Card className="p-6 space-y-4">
          <StepLabel n={3}>Your Stance</StepLabel>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStance('FOR')}
              className={`py-4 rounded-input border text-sm font-semibold transition-colors duration-150 ${
                stance === 'FOR'
                  ? 'border-success bg-success-subtle text-success'
                  : 'border-border bg-surface text-text-secondary hover:border-border-strong'
              }`}
            >
              PRO — For the Motion
            </button>
            <button
              type="button"
              onClick={() => setStance('AGAINST')}
              className={`py-4 rounded-input border text-sm font-semibold transition-colors duration-150 ${
                stance === 'AGAINST'
                  ? 'border-danger bg-danger-subtle text-danger'
                  : 'border-border bg-surface text-text-secondary hover:border-border-strong'
              }`}
            >
              CON — Against the Motion
            </button>
          </div>
        </Card>

        {/* Step 4: Debate Style */}
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
                  className={`${selectableCard(isSelected)} space-y-2`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                  <p className="text-xs font-semibold text-text">{style.label}</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed">{style.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Step 5: Difficulty */}
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
                  className={`${selectableCard(isSelected)} space-y-2`}
                >
                  <p className="text-xs font-semibold text-text">{diff.label}</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed">{diff.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Step 6: AI Personality */}
        <Card className="p-6 space-y-4">
          <StepLabel n={6}>AI Personality</StepLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_PERSONALITIES.map((personality) => {
              const Icon = personality.icon;
              const isSelected = aiPersonality === personality.id;
              return (
                <button
                  key={personality.id}
                  type="button"
                  onClick={() => setAiPersonality(personality.id)}
                  className={`${selectableCard(isSelected)} space-y-2`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-accent' : 'text-text-secondary'}`} />
                  <p className="text-xs font-semibold text-text">{personality.label}</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed">{personality.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {error && <ErrorState description={error} />}

        <Button type="submit" size="lg" fullWidth loading={submitting} rightIcon={!submitting ? <ArrowRight className="h-4 w-4" /> : undefined} leftIcon={!submitting ? <Sparkles className="h-4 w-4" /> : undefined}>
          {submitting ? 'Preparing debate floor…' : 'Enter Debate Arena'}
        </Button>
      </form>
    </div>
  );
}
