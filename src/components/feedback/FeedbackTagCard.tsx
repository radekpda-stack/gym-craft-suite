/**
 * FeedbackTagCard - Mobile-friendly card for displaying tag feedback metrics
 */

import { Badge } from '@/components/ui/badge';
import { MetricMiniBar } from './MetricMiniBar';
import { cn } from '@/lib/utils';

interface FeedbackTagCardProps {
  tagName: string;
  count: number;
  avgSoreness: number | null;
  avgEnergy: number | null;
  avgPain: number | null;
  avgBodyFeel: number | null;
  className?: string;
}

export function FeedbackTagCard({
  tagName,
  count,
  avgSoreness,
  avgEnergy,
  avgPain,
  avgBodyFeel,
  className,
}: FeedbackTagCardProps) {
  return (
    <div className={cn(
      'p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2.5',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="font-medium truncate max-w-[150px]">
          {tagName}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0">
          {count}×
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <MetricMiniBar 
          value={avgSoreness} 
          label="Svalovka" 
          size="sm" 
        />
        <MetricMiniBar 
          value={avgEnergy} 
          label="Energie" 
          size="sm" 
        />
        <MetricMiniBar 
          value={avgPain} 
          label="Bolest" 
          size="sm" 
        />
        <MetricMiniBar 
          value={avgBodyFeel} 
          label="Pocit" 
          size="sm" 
        />
      </div>
    </div>
  );
}
