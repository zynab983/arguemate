'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Award,
  Zap,
  Trophy,
  MessageSquare,
  Star,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonText } from '@/components/ui/Skeleton';

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    points: 0,
    rank: 'Novice',
    completedCount: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const currentUser = session.user;
          setUser(currentUser);

          const res = await fetch(`/api/debates?userId=${currentUser.id}`);
          const data = await res.json();
          const debates: any[] = data.debates || [];

          const sumScore = debates.reduce((acc: number, d: any) => acc + (d.score || 0), 0);
          const avg = debates.length > 0 ? Math.round(sumScore / debates.length) : 0;
          const points = sumScore;
          const rank =
            points >= 2000 ? 'Master' :
            points >= 1000 ? 'Expert' :
            points >= 500 ? 'Skilled' :
            points >= 200 ? 'Apprentice' : 'Novice';

          setStats({
            points,
            rank,
            completedCount: debates.length,
            avgScore: avg
          });
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Debater';

  if (loading) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8">
        <Card className="p-8">
          <SkeletonText lines={2} className="max-w-sm" />
        </Card>
      </div>
    );
  }

  const nextTierAt =
    stats.points >= 2000 ? stats.points :
    stats.points >= 1000 ? 2000 :
    stats.points >= 500 ? 1000 :
    stats.points >= 200 ? 500 : 200;

  const achievements = [
    {
      id: 'first-spar',
      name: 'First Spar',
      desc: 'Complete your first debate session',
      unlocked: stats.completedCount >= 1,
      icon: MessageSquare,
    },
    {
      id: 'rhetoric-master',
      name: 'Rhetoric Master',
      desc: 'Obtain an AI debate score above 90%',
      unlocked: stats.avgScore >= 90,
      icon: Star,
    },
    {
      id: 'xp-collector',
      name: 'XP Collector',
      desc: 'Reach 1,000 experience points',
      unlocked: stats.points >= 1000,
      icon: Zap,
    },
    {
      id: 'perfect-fallacy-free',
      name: 'Fallacy Slayer',
      desc: 'Complete a debate round with 0 fallacies flagged',
      unlocked: false,
      icon: Trophy,
    }
  ];

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-heading text-text">Profile</h1>
        <p className="text-body text-text-secondary mt-1">Track your rankings, debate stats, and unlocked achievements.</p>
      </div>

      {/* Profile Info Header */}
      <Card className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar name={userName} tone="accent" size="lg" className="rounded-card" />
          <div className="space-y-2 text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-text md:text-2xl">{userName}</h2>
            <p className="text-sm text-text-secondary">{user?.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <Badge tone="accent"><Award className="h-3.5 w-3.5" /> Rank: {stats.rank}</Badge>
              <Badge tone="neutral"><Zap className="h-3.5 w-3.5" /> {stats.points} XP Earned</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-subheading text-text">Achievements</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <Card
                  key={ach.id}
                  className={`p-5 flex gap-4 ${ach.unlocked ? '' : 'opacity-60'}`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${
                    ach.unlocked ? 'bg-accent text-text-inverse' : 'bg-surface-2 border border-border'
                  }`}>
                    {ach.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5 text-text-muted" />}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-bold text-text truncate">{ach.name}</h4>
                    <p className="text-xs text-text-secondary leading-snug">{ach.desc}</p>
                    {ach.unlocked && (
                      <span className="text-[10px] text-success font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3" /> Unlocked
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="space-y-4">
          <h3 className="text-subheading text-text">Performance Overview</h3>

          <Card className="p-6 space-y-5">
            <div>
              <div className="flex justify-between text-xs text-text-secondary font-medium">
                <span>Completed Matches</span>
                <span className="text-text font-semibold">{stats.completedCount}</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-badge mt-2 overflow-hidden">
                <div className="h-full bg-text rounded-badge" style={{ width: `${Math.min(stats.completedCount * 10, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-text-secondary font-medium">
                <span>Average AI Rating</span>
                <span className="text-text font-semibold">{stats.avgScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-badge mt-2 overflow-hidden">
                <div className="h-full bg-success rounded-badge" style={{ width: `${stats.avgScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-text-secondary font-medium">
                <span>Progress to Next Rank</span>
                <span className="text-text font-semibold">
                  {stats.points.toLocaleString()} / {nextTierAt.toLocaleString()} XP
                </span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-badge mt-2 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-badge"
                  style={{ width: `${Math.min(100, Math.round((stats.points / Math.max(nextTierAt, 1)) * 100))}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
