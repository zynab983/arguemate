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
  Loader2,
  Database,
  Users,
  Briefcase,
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
    { name: 'Overview',        href: '/dashboard',                 icon: LayoutDashboard },
    { name: 'Start Debate',   href: '/dashboard/debate',          icon: PlusCircle },
    { name: 'History',        href: '/dashboard/history',         icon: History },
    { name: 'Knowledge Base', href: '/dashboard/knowledge-base',  icon: Database },
    { name: 'Profile',        href: '/dashboard/profile',         icon: User },
    { name: 'Settings',       href: '/dashboard/settings',        icon: Settings },
    { name: 'Group Debate',   href: '/dashboard/rooms/new',       icon: Users },
    { name: 'Prepare',        href: '/dashboard/prepare',         icon: Briefcase },
  ];

  // Bottom tab bar shows only the first 4 items on mobile
  const mobileTabItems = navItems.slice(0, 4);

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
    <div className="min-h-screen bg-bg text-text flex selection:bg-accent-subtle">

      {/* ── LEFT SIDEBAR (desktop) ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 z-[var(--z-sticky)] border-r border-border bg-surface">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="EdQuanta" className="h-8 w-8 object-contain shrink-0" />
            <span className="text-sm font-semibold tracking-tight text-text">
              EdQuanta
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-surface-2 text-text'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text'
                  }
                `}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info + Sign Out at bottom */}
        <div className="shrink-0 border-t border-border px-3 py-4 space-y-2">
          <div className="flex items-center gap-2.5 px-2">
            <Avatar name={userName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-text">{userName}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text transition-colors duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT — offset by sidebar width on desktop ─────────── */}
      <main className="flex-1 flex flex-col min-w-0 md:ml-60 pb-16 md:pb-0">
        {children}
      </main>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[var(--z-sticky)] border-t border-border bg-surface/95 backdrop-blur-sm">
        <div className="grid grid-cols-4 h-16">
          {mobileTabItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-1 text-[10px] font-medium
                  transition-colors duration-150
                  ${isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'}
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name === 'Start Debate' ? 'Debate' : item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

