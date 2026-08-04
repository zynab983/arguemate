'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Menu, X, Award } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (err) {
        console.error('Error fetching user session:', err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[var(--z-sticky)] border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto max-w-content px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-text">
              <Award className="h-4 w-4 text-text-inverse" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-text">
              ArgueMate
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-[8px] px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA/User Button */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-20 animate-pulse rounded-input bg-surface-2" />
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm">Dashboard</Button>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-150"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text transition-colors duration-150">
                  Sign In
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden items-center justify-center rounded-[8px] p-2 text-text-secondary hover:bg-surface-2 hover:text-text"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-border bg-bg md:hidden animate-slide-up">
          <div className="space-y-1 px-4 pb-4 pt-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-[8px] px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
              {loading ? (
                <div className="h-9 w-full animate-pulse rounded-input bg-surface-2" />
              ) : user ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="secondary" fullWidth>Dashboard</Button>
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); handleSignOut(); }}
                    className="text-center rounded-input py-2 text-sm font-medium text-text-secondary hover:text-text"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-center rounded-input py-2 text-sm font-medium text-text-secondary hover:text-text"
                  >
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={() => setIsOpen(false)}>
                    <Button fullWidth>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
