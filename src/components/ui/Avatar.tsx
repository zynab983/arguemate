import { cn } from '@/lib/cn';

type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tone?: 'accent' | 'neutral';
};

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export function Avatar({ name, size = 'md', className, tone = 'neutral' }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-[10px] font-semibold',
        sizes[size],
        tone === 'accent' ? 'bg-accent text-text-inverse' : 'bg-surface-2 text-text-secondary border border-border',
        className
      )}
    >
      {initial}
    </span>
  );
}
