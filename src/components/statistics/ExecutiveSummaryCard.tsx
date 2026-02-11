import { useBusinessHealthMetrics } from '@/hooks/useBusinessHealthMetrics';
import { useSmartStatsInsights } from '@/hooks/useSmartStatsInsights';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus, Lightbulb, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 60;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className={cn('opacity-60', className)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
  const positive = value > 0;
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-[10px] font-medium',
      'text-muted-foreground'
    )}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value}%
    </span>
  );
}

export function ExecutiveSummaryCard() {
  const { data: metrics, isLoading } = useBusinessHealthMetrics();
  const { data: insights } = useSmartStatsInsights('career');

  if (isLoading) {
    return <Skeleton className="h-44 rounded-2xl" />;
  }

  if (!metrics) return null;

  const now = new Date();
  const monthLabel = format(now, 'LLLL yyyy', { locale: cs });
  const topInsight = insights?.[0];

  const kpis = [
    {
      label: 'Příjem',
      value: formatCurrency(metrics.currentMonthRevenue),
      change: metrics.revenueChange,
      spark: metrics.revenueSpark,
    },
    {
      label: 'Tréninky',
      value: metrics.currentMonthTrainings,
      change: metrics.trainingsChange,
      spark: metrics.trainingsSpark,
    },
    {
      label: 'Klienti',
      value: metrics.activeClients,
      change: metrics.clientsChange,
      spark: metrics.clientsSpark,
    },
    {
      label: 'Retence',
      value: `${metrics.retentionRate}%`,
      change: metrics.retentionChange,
      spark: null,
    },
  ];

  return (
    <Card className={cn(
      'relative overflow-hidden',
      'bg-gradient-to-br from-card via-card to-primary/5',
      'border-primary/20 shadow-lg shadow-primary/5',
      'backdrop-blur-md'
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/5" />
      
      <CardContent className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/15 ring-1 ring-primary/20">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Tvoje podnikání</h2>
              <p className="text-[10px] text-muted-foreground capitalize">{monthLabel}</p>
            </div>
          </div>
          {metrics.annualProjection > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Roční projekce</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {formatCurrency(metrics.annualProjection)}
              </p>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                {kpi.spark && <MiniSparkline data={kpi.spark} className="text-primary" />}
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-lg font-bold text-foreground tabular-nums">{kpi.value}</span>
                <TrendBadge value={kpi.change} />
              </div>
            </div>
          ))}
        </div>

        {/* Smart Insight */}
        {topInsight && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              {topInsight.icon} {topInsight.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
