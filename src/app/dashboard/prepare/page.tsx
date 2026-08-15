'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase, HandCoins, Lightbulb, Users, GraduationCap, MessagesSquare,
  ArrowRight, Sparkles, Check,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, FieldLabel } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';
import { CATEGORY_LIST, PREPARE_DIFFICULTIES, type PrepareCategory } from '@/lib/prepare/categories';

const CATEGORY_ICONS: Record<PrepareCategory, any> = {
  interview: Briefcase,
  negotiation: HandCoins,
  pitch: Lightbulb,
  'group-discussion': Users,
  viva: GraduationCap,
  communication: MessagesSquare,
};

export default function PrepareHub() {
  const router = useRouter();
  const [selected, setSelected] = useState<PrepareCategory | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [error, setError] = useState<string | null>(null);

  const selectedConfig = selected ? CATEGORY_LIST.find((c) => c.id === selected)! : null;

  const handleSelect = (id: PrepareCategory) => {
    setSelected(id);
    setFieldValues({});
    setError(null);
  };

  const handleBegin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig) return;

    for (const field of selectedConfig.contextFields) {
      if (field.required && !fieldValues[field.key]?.trim()) {
        setError(`Please fill in "${field.label}".`);
        return;
      }
    }

    const params = new URLSearchParams({ category: selectedConfig.id, difficulty });
    for (const field of selectedConfig.contextFields) {
      const v = fieldValues[field.key]?.trim();
      if (v) params.set(field.key, v);
    }
    router.push(`/dashboard/prepare/session?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="h-4 w-4 text-accent" />
          <span className="text-caption text-text-secondary uppercase">Prepare</span>
        </div>
        <h1 className="text-heading text-text">Practice for what's next</h1>
        <p className="text-body text-text-secondary mt-1">
          Pick a scenario and practice live against an AI that plays the part realistically — then get a score, feedback, and concrete tips.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORY_LIST.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id];
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelect(cat.id)}
              className={`text-left rounded-card border p-5 space-y-3 transition-colors duration-150 ${
                isSelected ? 'border-accent bg-accent-subtle' : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] border ${
                  isSelected ? 'bg-accent text-text-inverse border-accent' : 'bg-surface-2 text-text-secondary border-border'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                {isSelected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-text-inverse">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">{cat.label}</h3>
                <p className="text-caption text-text-secondary mt-0.5">Practice with: {cat.aiRoleLabel}</p>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{cat.description}</p>
            </button>
          );
        })}
      </div>

      {selectedConfig && (
        <Card className="p-6 space-y-5 max-w-xl">
          <div>
            <h2 className="text-subheading text-text">Set up: {selectedConfig.label}</h2>
            <p className="text-caption text-text-secondary mt-1">A couple of details so the {selectedConfig.aiRoleLabel.toLowerCase()} can play the part well.</p>
          </div>

          <form onSubmit={handleBegin} className="space-y-5">
            {selectedConfig.contextFields.map((field) => (
              <div key={field.key}>
                <FieldLabel>{field.label}{!field.required && ' (optional)'}</FieldLabel>
                <Input
                  required={field.required}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ''}
                  onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  maxLength={200}
                />
              </div>
            ))}

            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <div className="grid grid-cols-3 gap-3">
                {PREPARE_DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`py-3 rounded-input border text-xs font-semibold transition-colors duration-150 ${
                      difficulty === diff ? 'border-accent bg-accent-subtle text-accent-hover' : 'border-border bg-surface text-text-secondary hover:border-border-strong'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {error && <ErrorState description={error} />}

            <Button type="submit" fullWidth size="lg" leftIcon={<Sparkles className="h-4 w-4" />} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Begin Session
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
