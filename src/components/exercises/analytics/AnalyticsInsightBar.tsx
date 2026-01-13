import { Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsInsightBarProps {
  insight: string | undefined;
  isLoading?: boolean;
}

export function AnalyticsInsightBar({ insight, isLoading }: AnalyticsInsightBarProps) {
  if (isLoading) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border">
        <Skeleton className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
      <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80 leading-relaxed">
        {insight}
      </p>
    </div>
  );
}
