import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  mainValue: string | number;
  mainLabel: string;
  stats: Array<{
    label: string;
    value: string | number;
    trend?: number;
    trendLabel?: string;
  }>;
  children?: ReactNode;
}

export function KPIDetailModal({
  open,
  onOpenChange,
  title,
  icon,
  mainValue,
  mainLabel,
  stats,
  children,
}: KPIDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              {icon}
            </span>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Value */}
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-foreground">
              {typeof mainValue === 'number' ? mainValue.toLocaleString('cs-CZ') : mainValue}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{mainLabel}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass rounded-xl p-3 text-center"
              >
                <p className="text-lg font-semibold text-foreground">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString('cs-CZ') : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.trend !== undefined && (
                  <div
                    className={cn(
                      'flex items-center justify-center gap-1 text-xs mt-1',
                      stat.trend > 0 ? 'text-success' : stat.trend < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {stat.trend > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : stat.trend < 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    <span>{Math.abs(stat.trend).toFixed(0)}%</span>
                    {stat.trendLabel && <span className="text-muted-foreground">{stat.trendLabel}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Custom Content */}
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
