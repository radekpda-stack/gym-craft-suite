import { useSmartStatsInsights, SmartInsight } from '@/hooks/useSmartStatsInsights';
import { Lightbulb, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SmartBusinessInsightsProps {
  tab?: 'finance' | 'training' | 'client' | 'career';
  className?: string;
  maxItems?: number;
}

export function SmartBusinessInsights({ tab, className, maxItems = 3 }: SmartBusinessInsightsProps) {
  const { data: insights, isLoading } = useSmartStatsInsights(tab);

  if (isLoading) {
    return <Skeleton className="h-16 rounded-xl" />;
  }

  const filtered = tab
    ? insights?.filter(i => i.category === tab || i.category === 'general').slice(0, maxItems)
    : insights?.slice(0, maxItems);

  if (!filtered?.length) return null;

  const getIcon = (type: SmartInsight['type']) => {
    switch (type) {
      case 'action': return <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />;
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />;
      default: return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  const getBg = (type: SmartInsight['type']) => {
    switch (type) {
      case 'action': return 'bg-primary/5 border-primary/15 hover:bg-primary/8';
      case 'warning': return 'bg-warning/5 border-warning/15 hover:bg-warning/8';
      default: return 'bg-muted/30 border-border/50 hover:bg-muted/50';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {filtered.map((insight, idx) => (
        <div
          key={idx}
          className={cn(
            'flex items-start gap-2.5 p-3 rounded-xl border transition-colors cursor-default',
            getBg(insight.type)
          )}
        >
          <span className="mt-0.5">{getIcon(insight.type)}</span>
          <p className="text-xs text-foreground/80 flex-1 leading-relaxed">
            {insight.icon} {insight.message}
          </p>
        </div>
      ))}
    </div>
  );
}
