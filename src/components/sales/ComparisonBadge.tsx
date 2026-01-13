import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonBadgeProps {
  currentValue: number;
  previousValue: number;
  formatValue?: (value: number) => string;
  className?: string;
  invert?: boolean; // For metrics where lower is better (e.g., costs)
}

export function ComparisonBadge({ 
  currentValue, 
  previousValue, 
  className,
  invert = false 
}: ComparisonBadgeProps) {
  if (previousValue === 0) {
    return null; // Can't calculate percentage change from 0
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;
  const absChange = Math.abs(change);
  
  // Don't show if change is too small
  if (absChange < 0.5) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
        "bg-muted text-muted-foreground",
        className
      )}>
        <Minus className="w-3 h-3" />
        <span>0%</span>
      </div>
    );
  }

  const isPositive = change > 0;
  const isGood = invert ? !isPositive : isPositive;
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
      isGood 
        ? "bg-success/10 text-success" 
        : "bg-destructive/10 text-destructive",
      className
    )}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>
        {isPositive ? '+' : ''}{change.toFixed(0)}%
      </span>
    </div>
  );
}
