import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode;
  error?: boolean;
};

const fieldBase =
  'block w-full rounded-input border bg-surface text-text placeholder-text-muted ' +
  'outline-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

const fieldBorder = (error?: boolean) =>
  error
    ? 'border-danger focus:border-danger'
    : 'border-border focus:border-accent';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, error, className, ...props },
  ref
) {
  if (leftIcon) {
    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
          {leftIcon}
        </div>
        <input
          ref={ref}
          className={cn(fieldBase, fieldBorder(error), 'py-2.5 pl-10 pr-3.5 text-sm', className)}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      className={cn(fieldBase, fieldBorder(error), 'py-2.5 px-3.5 text-sm', className)}
      {...props}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, fieldBorder(error), 'py-2.5 px-3.5 text-sm resize-none', className)}
      {...props}
    />
  );
});

export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-caption text-text-secondary uppercase mb-2', className)}
      {...props}
    />
  );
}
