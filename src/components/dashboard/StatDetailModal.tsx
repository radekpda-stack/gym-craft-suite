import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  highlight?: boolean;
}

interface StatDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: LucideIcon;
  mainValue: string | number;
  mainLabel: string;
  stats: StatItem[];
  children?: ReactNode;
}

export function StatDetailModal({
  open,
  onOpenChange,
  title,
  icon: Icon,
  mainValue,
  mainLabel,
  stats,
  children,
}: StatDetailModalProps) {
  const getTrendIcon = (trend: number | undefined) => {
    if (trend === undefined || trend === 0) return <Minus className="w-3 h-3" />;
    return trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = (trend: number | undefined) => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-emerald-500' : 'text-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main value */}
          <div className="text-center py-4 rounded-lg bg-primary/10">
            <div className="text-4xl font-bold text-foreground">{mainValue}</div>
            <div className="text-sm text-muted-foreground mt-1">{mainLabel}</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg",
                  stat.highlight ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
                )}
              >
                <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                {stat.trend !== undefined && (
                  <div className={cn("flex items-center gap-1 mt-1 text-xs", getTrendColor(stat.trend))}>
                    {getTrendIcon(stat.trend)}
                    <span>{stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}%</span>
                    {stat.trendLabel && <span className="text-muted-foreground">({stat.trendLabel})</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom content */}
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
