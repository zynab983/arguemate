'use client';

import Link from 'next/link';
import { ArrowRight, Bot, User, Brain } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8 items-center">

          {/* Left Column: Heading and CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-7">
            <Badge tone="accent" className="mx-auto lg:mx-0">
              <Bot className="h-3 w-3" />
              Practice debating with advanced AI
            </Badge>

            <h1 className="text-display text-text max-w-xl mx-auto lg:mx-0">
              Think better.
              <br />
              Debate smarter.
            </h1>

            <p className="max-w-md mx-auto lg:mx-0 text-body text-text-secondary">
              Your private AI sparring partner. Structure an argument, get instant rebuttals, and see exactly where your reasoning holds up — or doesn&apos;t.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-1">
              <Link href="/signup">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} className="w-full sm:w-auto">
                  Start sparring free
                </Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  See features
                </Button>
              </a>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 border-t border-border">
              <div className="pt-6">
                <p className="text-heading text-text">50+</p>
                <p className="text-caption text-text-secondary mt-0.5">Debate topics</p>
              </div>
              <div className="pt-6">
                <p className="text-heading text-text">Live</p>
                <p className="text-caption text-text-secondary mt-0.5">Fallacy reports</p>
              </div>
              <div className="pt-6">
                <p className="text-heading text-text">Gemini</p>
                <p className="text-caption text-text-secondary mt-0.5">Powered AI</p>
              </div>
            </div>
          </div>

          {/* Right Column: Structured reasoning preview */}
          <div className="lg:col-span-5 relative w-full max-w-md mx-auto lg:max-w-none">
            <div className="relative rounded-card border border-border bg-surface shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-caption text-text-secondary">Live session</span>
                </div>
                <span className="text-caption text-text-muted">Universal Basic Income</span>
              </div>

              {/* Structured reasoning */}
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-text text-text-inverse">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-caption text-text-muted">Claim · You (Pro)</p>
                    <p className="text-sm text-text leading-relaxed">
                      UBI is essential in an era of rapid automation — it provides a safety net that encourages entrepreneurial risk-taking.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-input border border-accent-border bg-accent-subtle px-3.5 py-3 ml-10">
                  <Brain className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-caption text-accent-hover">Real-time critique</p>
                    <p className="text-xs text-text-secondary leading-relaxed">No fallacies detected. Argument strength: 85%.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-surface-2 border border-border text-text-secondary">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-caption text-text-muted">Counter-argument · ArgueBot</p>
                    <p className="text-sm text-text leading-relaxed">
                      Wouldn&apos;t UBI risk triggering inflation, diluting the real purchasing power of the stipend?
                    </p>
                  </div>
                </div>
              </div>

              {/* Input preview */}
              <div className="border-t border-border p-4 flex gap-2">
                <div className="flex-1 rounded-input bg-surface-2 border border-border px-3.5 py-2.5 text-xs text-text-muted flex items-center justify-between">
                  <span>Type your rebuttal…</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-xs bg-surface text-[10px] border border-border text-text-muted">⌘⏎</kbd>
                </div>
                <button className="rounded-input bg-accent px-3.5 flex items-center justify-center text-text-inverse hover:bg-accent-hover transition-colors duration-150">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
