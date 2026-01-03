/**
 * FeedbackMetricDetailDialog
 * 
 * Dialog showing detailed view of a specific feedback metric
 * with larger chart, statistics, and feedback list.
 */

import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  inverted?: boolean;
  getValue: (f: TrainingFeedback) => number | null;
  suffix?: string;
}

interface FeedbackMetricDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: MetricConfig;
  feedback: TrainingFeedback[];
  period: number;
}

export function FeedbackMetricDetailDialog({
  open,
  onOpenChange,
  metric,
  feedback,
  period,
}: FeedbackMetricDetailDialogProps) {
  const analytics = useMemo(() => {
    if (!feedback.length) return null;

    const cutoffDate = subDays(new Date(), period);
    const previousCutoffDate = subDays(cutoffDate, period);

    // Current period feedback
    const currentPeriodFeedback = feedback.filter(f => 
      new Date(f.created_at) >= cutoffDate
    );

    // Previous period feedback for comparison
    const previousPeriodFeedback = feedback.filter(f => {
      const date = new Date(f.created_at);
      return date >= previousCutoffDate && date < cutoffDate;
    });

    // Get values for current and previous period
    const currentValues = currentPeriodFeedback
      .map(f => metric.getValue(f))
      .filter((v): v is number => v != null);
    
    const previousValues = previousPeriodFeedback
      .map(f => metric.getValue(f))
      .filter((v): v is number => v != null);

    // Calculate statistics
    const avg = currentValues.length > 0 
      ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length 
      : null;
    const min = currentValues.length > 0 ? Math.min(...currentValues) : null;
    const max = currentValues.length > 0 ? Math.max(...currentValues) : null;
    const count = currentValues.length;

    const prevAvg = previousValues.length > 0
      ? previousValues.reduce((a, b) => a + b, 0) / previousValues.length
      : null;

    // Trend calculation
    let trendPercent: number | null = null;
    if (avg != null && prevAvg != null && prevAvg !== 0) {
      trendPercent = ((avg - prevAvg) / prevAvg) * 100;
    }

    // Chart data
    const chartData = currentPeriodFeedback
      .map(f => ({
        date: format(new Date(f.created_at), period > 90 ? 'MMM' : 'd.M', { locale: cs }),
        fullDate: format(new Date(f.created_at), 'd. MMMM yyyy', { locale: cs }),
        value: metric.getValue(f),
        id: f.id,
      }))
      .filter(d => d.value != null)
      .reverse();

    return {
      avg,
      min,
      max,
      count,
      prevAvg,
      trendPercent,
      chartData,
      feedbackList: currentPeriodFeedback.filter(f => metric.getValue(f) != null),
    };
  }, [feedback, period, metric]);

  const getPeriodLabel = () => {
    if (period === 7) return '7 dní';
    if (period === 30) return '30 dní';
    if (period === 90) return '90 dní';
    return '1 rok';
  };

  const TrendIndicator = ({ percent, inverted }: { percent: number | null; inverted?: boolean }) => {
    if (percent == null) return null;
    
    const isUp = percent > 5;
    const isDown = percent < -5;
    
    if (!isUp && !isDown) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Minus className="w-4 h-4" />
          Stabilní
        </span>
      );
    }
    
    const isPositive = inverted ? isDown : isUp;
    
    return (
      <span className={cn(
        'flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-success' : 'text-destructive'
      )}>
        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {isUp ? '+' : ''}{percent.toFixed(0)}%
      </span>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-medium">{data?.fullDate}</p>
          <p style={{ color: metric.color }} className="font-semibold">
            {metric.label}: {data?.value}{metric.suffix || '/10'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!analytics) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {metric.icon}
            {metric.label} - Detail za {getPeriodLabel()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Průměr</p>
              <p className="text-xl font-bold" style={{ color: metric.color }}>
                {analytics.avg?.toFixed(1) ?? '—'}{metric.suffix || '/10'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Min / Max</p>
              <p className="text-lg font-semibold">
                {analytics.min ?? '—'} / {analytics.max ?? '—'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Trend</p>
              <TrendIndicator percent={analytics.trendPercent} inverted={metric.inverted} />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Záznamů</p>
              <p className="text-lg font-semibold">{analytics.count}</p>
            </div>
          </div>

          {/* Previous period comparison */}
          {analytics.prevAvg != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Předchozí období: {analytics.prevAvg.toFixed(1)}{metric.suffix || '/10'}
            </div>
          )}

          {/* Large Chart */}
          {analytics.chartData.length > 1 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    tick={{ fontSize: 11 }} 
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                    ticks={[0, 2, 4, 6, 8, 10]}
                  />
                  {analytics.avg != null && (
                    <ReferenceLine 
                      y={analytics.avg} 
                      stroke={metric.color} 
                      strokeDasharray="5 5" 
                      strokeOpacity={0.5}
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={metric.label}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: metric.color }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-muted-foreground">
              Nedostatek dat pro zobrazení grafu
            </div>
          )}

          {/* Feedback List */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Feedbacky v období ({analytics.feedbackList.length})
            </h4>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2 pr-4">
                {analytics.feedbackList.map(f => {
                  const value = metric.getValue(f);
                  return (
                    <div 
                      key={f.id}
                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm"
                    >
                      <span className="text-muted-foreground">
                        {format(new Date(f.created_at), 'd. MMMM yyyy', { locale: cs })}
                      </span>
                      <Badge 
                        variant="secondary"
                        style={{ 
                          backgroundColor: `${metric.color}20`,
                          color: metric.color,
                        }}
                      >
                        {value}{metric.suffix || '/10'}
                      </Badge>
                    </div>
                  );
                })}
                {analytics.feedbackList.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Žádné záznamy v tomto období
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
