import { useBusinessHealthMetrics } from '@/hooks/useBusinessHealthMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CapacityUtilizationCard() {
  const { data: metrics, isLoading } = useBusinessHealthMetrics();

  if (isLoading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!metrics) return null;

  const pct = metrics.capacityUtilization;
  // SVG gauge
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <Card className="bg-card/80 backdrop-blur-md border-border/50 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="6"
              />
              <circle
                cx="40" cy="40" r={radius}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold tabular-nums">{pct}%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Kapacita</p>
            <p className="text-sm font-medium mt-1">
              {metrics.currentMonthTrainings} tréninků tento měsíc
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              vytíženost kapacity
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
