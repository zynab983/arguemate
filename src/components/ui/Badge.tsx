import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-secondary border-border',
  accent: 'bg-accent-subtle text-accent-hover border-accent-border',
  success: 'bg-success-subtle text-success border-success-border',
  warning: 'bg-warning-subtle text-[#92400E] border-warning-border',
  danger: 'bg-danger-subtle text-danger border-danger-border',
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-badge border px-2.5 py-0.5 text-caption font-semibold',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
