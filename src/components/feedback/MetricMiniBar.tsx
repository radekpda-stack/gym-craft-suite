/**
 * MetricMiniBar - Visual progress bar for 0-10 scale metrics
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MetricMiniBarProps {
  value: number | null;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
  maxValue?: number;
  className?: string;
}

export function MetricMiniBar({
  value,
  label,
  showValue = true,
  size = 'sm',
  maxValue = 10,
  className,
}: MetricMiniBarProps) {
  const hasValue = value !== null && !isNaN(value);
  const percentage = hasValue ? Math.min(100, Math.max(0, (value / maxValue) * 100)) : 0;
  const displayValue = hasValue ? value.toFixed(1) : '—';

  const barHeight = size === 'sm' ? 'h-1' : 'h-1.5';

  const content = (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {label && (
        <span className="text-xs text-muted-foreground shrink-0 w-16 truncate">
          {label}
        </span>
      )}
      <div className={cn('flex-1 bg-muted rounded-full overflow-hidden min-w-8', barHeight)}>
        {hasValue && (
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {showValue && (
        <span className="text-xs font-medium tabular-nums shrink-0 w-8 text-right">
          {displayValue}
        </span>
      )}
    </div>
  );

  if (!label) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">
            {label}: {displayValue}{hasValue ? '/10' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
