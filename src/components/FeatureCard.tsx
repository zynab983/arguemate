import type { ComponentType } from 'react';
import { Card } from '@/components/ui/Card';

type FeatureCardProps = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export default function FeatureCard({ title, description, icon: Icon }: FeatureCardProps) {
  return (
    <Card className="p-6 hover:border-border-strong hover:shadow-sm transition-all duration-150">
      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-subtle border border-accent-border text-accent mb-5">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="text-sm font-semibold text-text mb-1.5">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    </Card>
  );
}
