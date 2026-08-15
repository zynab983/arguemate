'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input, FieldLabel } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/EmptyState';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: name }),
      });

      const payload = await res.json();

      if (!res.ok) {
        setError(typeof payload?.error === 'string' && payload.error ? payload.error : 'Sign up failed. Please try again.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const next = searchParams.get('redirectedFrom') || '/dashboard';
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) setError(authError.message);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12 text-text selection:bg-accent-subtle">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="EdQuanta" className="h-9 w-9 object-contain shrink-0" />
            <span className="text-lg font-semibold tracking-tight text-text">
              EdQuanta
            </span>
          </Link>
          <h2 className="text-subheading text-text">Create account</h2>
          <p className="text-caption text-text-secondary mt-1">Get started with AI debate practice</p>
        </div>

        <div className="rounded-card border border-border bg-surface p-7">
          {error && <ErrorState title="Couldn't create account" description={error} className="mb-5" />}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <Input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
              />
            </div>

            <div>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
              />
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
              />
            </div>

            <Button type="submit" fullWidth loading={loading} rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}>
              Sign Up
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-caption">
              <span className="bg-surface px-3 text-text-muted">Or continue with</span>
            </div>
          </div>

          <Button variant="secondary" fullWidth disabled={loading} onClick={handleGoogleLogin} type="button">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-hover font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg text-text">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          <p className="text-sm text-text-secondary">Loading auth portal…</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
