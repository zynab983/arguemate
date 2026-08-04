'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  Trophy,
  MessageSquare,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  Brain,
  Calendar,
  Zap
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, SkeletonText } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardOverview() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalDebates: 0,
    averageScore: 0,
    totalPoints: 0,
    rank: 'Novice'
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const currentUser = session.user;
          setUser(currentUser);

          const res = await fetch(`/api/debates?userId=${currentUser.id}`);
          const data = await res.json();
          const debates: any[] = data.debates || [];

          const total = debates.length;
          const sumScore = debates.reduce((acc: number, d: any) => acc + (d.score || 0), 0);
          const avg = total > 0 ? Math.round(sumScore / total) : 0;
          const points = sumScore;
          const rank =
            points >= 2000 ? 'Master' :
            points >= 1000 ? 'Expert' :
            points >= 500 ? 'Skilled' :
            points >= 200 ? 'Apprentice' : 'Novice';

          setStats({
            totalDebates: total,
            averageScore: avg,
            totalPoints: points,
            rank,
          });

          setRecentActivity(debates.slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Debater';

  if (loading) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8">
        <div className="rounded-card border border-border bg-surface p-8">
          <SkeletonText lines={2} className="max-w-sm" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-card border border-border bg-surface p-6 md:p-8">
        <div className="max-w-2xl space-y-4">
          <Badge tone="accent">
            <Sparkles className="h-3 w-3" /> Practice makes perfect
          </Badge>
          <h1 className="text-heading text-text">
            Welcome back, {userName}
          </h1>
          <p className="text-body text-text-secondary">
            Ready to test your persuasion skills? Launch a new session, select your stance, and challenge ArgueBot.
          </p>
          <div className="pt-2">
            <Link href="/dashboard/debate">
              <Button rightIcon={<ArrowRight className="h-4 w-4" />}>
                Start New Debate
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-secondary uppercase">Total Debates</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 border border-border text-text-secondary">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-text mt-4">{stats.totalDebates}</p>
          <p className="text-caption text-text-muted mt-1">Practice matches started</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-secondary uppercase">Average Score</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-success-subtle border border-success-border text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-text mt-4">{stats.averageScore}%</p>
          <p className="text-caption text-text-muted mt-1">Based on AI criteria analysis</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-secondary uppercase">Total Points</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-2 border border-border text-text-secondary">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-text mt-4">{stats.totalPoints} XP</p>
          <p className="text-caption text-text-muted mt-1">Experience earned in sparring</p>
        </Card>

        {/* Rank card gets a subtle accent treatment — it's the primary gamification hook */}
        <Card className="p-6 border-accent-border bg-accent-subtle">
          <div className="flex items-center justify-between">
            <span className="text-caption text-accent-hover uppercase">Current Rank</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-text-inverse">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-text mt-4">{stats.rank}</p>
          <p className="text-caption text-accent-hover/80 mt-1">Unlock tiers at higher XP</p>
        </Card>
      </div>

      {/* Main Grid: Recent Activity & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Recent Activity Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-subheading text-text">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-5 w-5" />}
              title="No debates recorded yet"
              description="Start your first session to see your activity and scores here."
              action={
                <Link href="/dashboard/debate">
                  <Button size="sm">Start your first debate</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href="/dashboard/history"
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-card border border-border bg-surface p-5 hover:border-border-strong transition-colors duration-150"
                >
                  <div className="space-y-1.5 min-w-0">
                    <Badge tone="neutral">{activity.difficulty || 'Debate'}</Badge>
                    <h3 className="text-sm font-semibold text-text truncate group-hover:text-accent transition-colors duration-150">
                      {activity.topic}
                    </h3>
                    <p className="text-caption text-text-secondary">
                      Result:{' '}
                      <span className={
                        activity.winner === 'User' ? 'text-success font-semibold' :
                        activity.winner === 'AI' ? 'text-danger font-semibold' : 'text-text-secondary font-semibold'
                      }>{activity.winner === 'User' ? 'Won' : activity.winner === 'AI' ? 'Lost' : 'Draw'}</span>
                      {activity.created_at ? ` · ${new Date(activity.created_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                    {activity.score != null && (
                      <div className="text-right">
                        <span className="text-sm font-bold text-success">{activity.score}%</span>
                        <p className="text-[10px] text-text-muted">AI Score</p>
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Training Tips */}
        <div className="space-y-4">
          <h2 className="text-subheading text-text">Debate Insights</h2>

          <Card className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-2 border border-border text-text-secondary shrink-0">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text">Avoid Ad Hominem</h4>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  Focus on the arguments, not the character of the speaker — personal attacks are scored heavily against you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-2 border border-border text-text-secondary shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text">Acknowledge Counterpoints</h4>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  Rebutting effectively means stating your opponent's case and dismantling its assumptions, not ignoring it.
                </p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
