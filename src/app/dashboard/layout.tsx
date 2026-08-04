'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  User,
  Settings,
  LogOut,
  Award,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    }
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Start Debate', href: '/dashboard/debate', icon: PlusCircle },
    { name: 'History', href: '/dashboard/history', icon: History },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          <p className="text-sm text-text-secondary">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Debater';

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col selection:bg-accent-subtle">

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto max-w-content px-6">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-text">
                <Award className="h-4 w-4 text-text-inverse" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-text hidden sm:block">
                ArgueMate
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors duration-150
                      ${isActive
                        ? 'bg-surface-2 text-text'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-text'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User + Sign out (desktop) */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <Avatar name={userName} size="sm" />
                <div className="min-w-0 hidden lg:block">
                  <p className="text-xs font-semibold truncate text-text max-w-[120px]">{userName}</p>
                  <p className="text-[10px] text-text-muted truncate max-w-[120px]">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface-2 transition-colors duration-150"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden rounded-[8px] p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="border-t border-border bg-bg md:hidden animate-slide-up">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors duration-150
                      ${isActive
                        ? 'bg-surface-2 text-text'
                        : 'text-text-secondary hover:bg-surface-2 hover:text-text'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={userName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-text">{userName}</p>
                    <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-1.5 rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface-2 transition-colors duration-150 shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area — each page controls its own max-width so the
          debate workspace can go wider than standard content pages. */}
      <main className="flex-1 flex flex-col min-w-0 relative w-full">
        {children}
      </main>
    </div>
  );
}
