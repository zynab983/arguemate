import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-2/40 p-10 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[10px] bg-surface border border-border text-text-muted">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-text">{title}</p>
      {description && <p className="text-caption text-text-secondary mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

type ErrorStateProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ icon, title = 'Something went wrong', description, action, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-input border border-danger-border bg-danger-subtle p-4 text-sm',
        className
      )}
    >
      {icon && <div className="text-danger shrink-0 mt-0.5">{icon}</div>}
      <div className="space-y-1">
        <p className="font-semibold text-danger">{title}</p>
        {description && <p className="text-danger/90 text-xs leading-relaxed">{description}</p>}
        {action}
      </div>
    </div>
  );
}
