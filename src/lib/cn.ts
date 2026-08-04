/**
 * Tiny className combiner (no external dependency).
 * Usage: cn('base', condition && 'variant', className)
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
