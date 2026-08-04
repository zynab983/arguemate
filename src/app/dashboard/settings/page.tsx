'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { prisma } from '@/lib/db';
import {
  User,
  Bot,
  Check,
  Save,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, FieldLabel } from '@/components/ui/Input';
import { SkeletonText } from '@/components/ui/Skeleton';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [aiStyle, setAiStyle] = useState('Socratic');

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setName(session.user.user_metadata?.full_name || '');

          if (typeof window !== 'undefined') {
            setAiStyle(localStorage.getItem('arguemate_default_ai_style') || 'Socratic');
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name }
      });
      if (updateError) throw updateError;

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { name }
        }).catch((e: any) => console.log('Mock/Real DB user update done locally:', e));
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('arguemate_default_ai_style', aiStyle);
      }

      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-content w-full p-6 md:p-8">
        <Card className="p-8 max-w-2xl">
          <SkeletonText lines={2} className="max-w-sm" />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content w-full p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-heading text-text">Settings</h1>
        <p className="text-body text-text-secondary mt-1">Configure your personal profile options and default AI opponent.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card>
          <div className="flex items-center gap-3 border-b border-border p-6 pb-4">
            <User className="h-4 w-4 text-text-secondary" />
            <h2 className="text-caption text-text uppercase">Profile Information</h2>
          </div>
          <CardContent className="space-y-4">
            <div>
              <FieldLabel>Display Name</FieldLabel>
              <Input
                type="text"
                required
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <Input type="email" disabled value={user?.email || ''} />
            </div>
          </CardContent>
        </Card>

        {/* AI Settings Card */}
        <Card>
          <div className="flex items-center gap-3 border-b border-border p-6 pb-4">
            <Bot className="h-4 w-4 text-text-secondary" />
            <h2 className="text-caption text-text uppercase">Default AI Opponent</h2>
          </div>
          <CardContent>
            <FieldLabel>Speaking Persona</FieldLabel>
            <select
              value={aiStyle}
              onChange={(e) => setAiStyle(e.target.value)}
              className="block w-full rounded-input border border-border bg-surface p-3 text-sm text-text outline-none focus:border-accent transition-colors duration-150 cursor-pointer"
            >
              <option value="Socratic">Socratic (Queries assumptions, gentle probing)</option>
              <option value="Analytical">Analytical (Relies strictly on facts &amp; stats)</option>
              <option value="Aggressive">Aggressive (Dismantles fallacies immediately)</option>
            </select>
          </CardContent>
        </Card>

        {/* Save action below the cards */}
        <div className="space-y-3">
          {successMsg && (
            <p className="text-xs font-semibold text-success flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> {successMsg}
            </p>
          )}
          <Button type="submit" fullWidth size="lg" loading={submitting} leftIcon={!submitting ? <Save className="h-4 w-4" /> : undefined}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
