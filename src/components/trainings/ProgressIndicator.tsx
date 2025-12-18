import { ProgressStatus } from '@/hooks/useTrainingProgress';
import { TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  status: ProgressStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig = {
  improvement: {
    icon: TrendingUp,
    label: 'Zlepšení',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
  },
  stagnation: {
    icon: Minus,
    label: 'Stagnace',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-muted-foreground/30',
  },
  overload: {
    icon: AlertTriangle,
    label: 'Přetížení',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
};

export function ProgressIndicator({ 
  status, 
  showLabel = true, 
  size = 'sm',
  className 
}: ProgressIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5",
      showLabel && cn(
        "px-2 py-1 rounded-full border",
        config.bgColor,
        config.borderColor
      ),
      className
    )}>
      <Icon className={cn(sizeClasses[size], config.color)} />
      {showLabel && (
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function ProgressDot({ status }: { status: ProgressStatus }) {
  const colors = {
    improvement: 'bg-success',
    stagnation: 'bg-muted-foreground',
    overload: 'bg-destructive',
  };

  return (
    <div className={cn("w-2.5 h-2.5 rounded-full", colors[status])} />
  );
}
