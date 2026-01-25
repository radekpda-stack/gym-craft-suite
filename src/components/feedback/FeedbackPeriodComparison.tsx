/**
 * FeedbackPeriodComparison - Compare feedback metrics between two time periods
 * Fixed: safe response rate, NaN handling, metric tooltips
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarDays, TrendingUp, TrendingDown, Minus, ArrowRight, HelpCircle } from 'lucide-react';
import { useFeedbackPeriodComparison, PeriodType } from '@/hooks/useFeedbackPeriodComparison';
import { cn } from '@/lib/utils';
import { METRIC_EXPLANATIONS } from '@/lib/feedbackCalculations';

interface FeedbackPeriodComparisonProps {
  clientId?: string;
  className?: string;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: '7d', label: 'Posledních 7 dní' },
  { value: '30d', label: 'Posledních 30 dní' },
  { value: '90d', label: 'Posledních 90 dní' },
  { value: 'month', label: 'Tento měsíc' },
];

// Max change to display (prevents absurd percentages like +3000%)
const MAX_CHANGE_DISPLAY = 100;

const ChangeIndicator = ({ 
  value, 
  inverted = false,
  suffix = '' 
}: { 
  value: number | null; 
  inverted?: boolean;
  suffix?: string;
}) => {
  if (value === null || isNaN(value)) return <span className="text-muted-foreground">—</span>;
  
  // Cap display value to reasonable range
  const cappedValue = Math.abs(value) > MAX_CHANGE_DISPLAY;
  const displayValue = cappedValue 
    ? (value > 0 ? `>${MAX_CHANGE_DISPLAY}` : `<-${MAX_CHANGE_DISPLAY}`)
    : value.toFixed(1);
  
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  
  return (
    <span className={cn(
      "flex items-center gap-1",
      isPositive && "text-success",
      isNegative && "text-destructive"
    )}>
      {value > 0 ? (
        <TrendingUp className="w-3.5 h-3.5" />
      ) : value < 0 ? (
        <TrendingDown className="w-3.5 h-3.5" />
      ) : (
        <Minus className="w-3.5 h-3.5" />
      )}
      {value > 0 && !cappedValue ? '+' : ''}{displayValue}{suffix}
    </span>
  );
};

// Safe format for metric values
const formatMetric = (value: number | null, suffix: string = '/10'): string => {
  if (value === null || isNaN(value) || !isFinite(value)) return '—';
  return `${value.toFixed(1)}${suffix}`;
};

const MetricRow = ({ 
  label, 
  metricKey,
  current, 
  previous, 
  change,
  inverted = false,
  suffix = '/10'
}: {
  label: string;
  metricKey?: keyof typeof METRIC_EXPLANATIONS;
  current: number | null;
  previous: number | null;
  change: number | null;
  inverted?: boolean;
  suffix?: string;
}) => {
  const metric = metricKey ? METRIC_EXPLANATIONS[metricKey] : null;
  
  return (
    <TableRow>
      <TableCell className="font-medium">
        {metric ? (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                {label}
                <HelpCircle className="w-3 h-3 text-muted-foreground/50" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                  <p className="text-xs text-primary/80 font-mono">{metric.scale}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : label}
      </TableCell>
      <TableCell className="text-center">
        {formatMetric(current, suffix)}
      </TableCell>
      <TableCell className="text-center">
        {formatMetric(previous, suffix)}
      </TableCell>
      <TableCell className="text-center">
        <ChangeIndicator value={change} inverted={inverted} />
      </TableCell>
    </TableRow>
  );
};

export function FeedbackPeriodComparison({ 
  clientId,
  className 
}: FeedbackPeriodComparisonProps) {
  const [periodType, setPeriodType] = useState<PeriodType>('30d');
  const { data, isLoading } = useFeedbackPeriodComparison(periodType, clientId);
  
  if (isLoading) {
    return (
      <Card className={cn("glass", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Porovnání období
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return null;
  }
  
  return (
    <Card className={cn("glass", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Porovnání období
          </div>
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period labels */}
        <div className="flex items-center justify-center gap-3 text-sm">
          <Badge variant="secondary">{data.currentPeriod.periodLabel}</Badge>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">{data.previousPeriod.periodLabel}</Badge>
        </div>
        
        {/* Summary stats - with safe response rate (max 100%) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold">
              {Math.min(data.currentPeriod.responseRate, 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Míra odpovědí</div>
            <div className="text-xs text-muted-foreground">
              {Math.min(data.currentPeriod.totalCompleted, data.currentPeriod.totalSent)} z {data.currentPeriod.totalSent}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold">
              {data.currentPeriod.totalCompleted}
            </div>
            <div className="text-xs text-muted-foreground">Vyplněno</div>
            <span className="text-xs text-muted-foreground">
              za období
            </span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <div className="text-2xl font-bold">
              {data.currentPeriod.redFlagsCount}
            </div>
            <div className="text-xs text-muted-foreground">Red Flags</div>
            <ChangeIndicator value={data.changes.redFlagsCount} inverted />
          </div>
        </div>
        
        {/* Metrics comparison table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metrika</TableHead>
                <TableHead className="text-center">Aktuální</TableHead>
                <TableHead className="text-center">Předchozí</TableHead>
                <TableHead className="text-center">Změna</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <MetricRow
                label="Pocit těla"
                metricKey="bodyFeel"
                current={data.currentPeriod.avgBodyFeel}
                previous={data.previousPeriod.avgBodyFeel}
                change={data.changes.avgBodyFeel}
              />
              <MetricRow
                label="Energie"
                metricKey="energy"
                current={data.currentPeriod.avgEnergy}
                previous={data.previousPeriod.avgEnergy}
                change={data.changes.avgEnergy}
              />
              <MetricRow
                label="Zábava"
                metricKey="fun"
                current={data.currentPeriod.avgFun}
                previous={data.previousPeriod.avgFun}
                change={data.changes.avgFun}
              />
              <MetricRow
                label="Svalovka"
                metricKey="soreness"
                current={data.currentPeriod.avgSoreness}
                previous={data.previousPeriod.avgSoreness}
                change={data.changes.avgSoreness}
                inverted
              />
              <MetricRow
                label="Bolest"
                metricKey="pain"
                current={data.currentPeriod.avgPain}
                previous={data.previousPeriod.avgPain}
                change={data.changes.avgPain}
                inverted
              />
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
