import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeatureCard from '@/components/FeatureCard';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Bot,
  BrainCircuit,
  Trophy,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: "Debate with AI",
      description: "Argue with an AI opponent in real time. Pick how tough it should be and how it argues back.",
      icon: Bot,
    },
    {
      title: "Fallacy Detection",
      description: "The AI spots weak points in your arguments, like personal attacks or false comparisons, and tells you about them.",
      icon: ShieldAlert,
    },
    {
      title: "Points & Ranks",
      description: "Every debate earns you points. Collect enough and you move up from Novice all the way to Master.",
      icon: Trophy,
    },
    {
      title: "Instant Feedback",
      description: "After each debate you get a full report: your score, what you did well, and what to fix next time.",
      icon: BrainCircuit,
    }
  ];

  const steps = [
    {
      num: "01",
      title: "Pick a Topic",
      description: "Choose a topic, decide if you're for or against it, and set how hard the AI should be."
    },
    {
      num: "02",
      title: "Make Your Case",
      description: "Type your arguments and respond to the AI's counterpoints, turn by turn."
    },
    {
      num: "03",
      title: "See Your Score",
      description: "End the debate and get your score, grade, strengths, weaknesses, and tips to improve."
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-text selection:bg-accent-subtle font-sans">
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-border relative">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-heading text-text">
              Everything you need to argue well
            </h2>
            <p className="text-body text-text-secondary">
              Practice real debates with AI, find the holes in your arguments, and watch your skills improve with every round.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <FeatureCard
                key={i}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 border-t border-border bg-surface relative">
        <div className="mx-auto max-w-content px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-heading text-text">
              How it works
            </h2>
            <p className="text-body text-text-secondary">
              Three simple steps from picking a topic to getting your score.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {steps.map((step, i) => (
              <div key={i} className="relative rounded-card border border-border bg-bg p-7">
                <span className="text-caption text-accent font-mono">Step {step.num}</span>
                <h3 className="text-sm font-semibold text-text mt-2 mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border relative">
        <div className="mx-auto max-w-content px-6">
          <div className="relative rounded-card overflow-hidden border border-border bg-surface p-10 sm:p-14 md:p-16 text-center">
            <div className="max-w-xl mx-auto space-y-6">
              <Badge tone="accent" className="mx-auto">
                <Sparkles className="h-3 w-3" /> Get instant access
              </Badge>
              <h2 className="text-heading text-text">
                Ready to level up your critical thinking?
              </h2>
              <p className="text-body text-text-secondary">
                Join students and professionals worldwide who use EdQuanta daily to refine their debate abilities.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />} className="w-full sm:w-auto">
                    Create free account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
