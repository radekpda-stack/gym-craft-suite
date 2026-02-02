import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Dumbbell, Banknote, Users } from 'lucide-react';
import type { StatsPeriodRange } from './StatsPeriodSelector';

interface PeriodComparisonCardProps {
  periodRange: StatsPeriodRange | undefined;
}

function TrendIndicator({ value, label }: { value: number; label?: string }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs",
      isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600" : "text-destructive"
    )}>
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive ? '+' : ''}{value}%
        {label && <span className="text-muted-foreground ml-1">{label}</span>}
      </span>
    </div>
  );
}

function MetricBox({ 
  icon: Icon, 
  label, 
  value, 
  change,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  borderColor = "border-primary/20"
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  change: number;
  iconColor?: string;
  iconBg?: string;
  borderColor?: string;
}) {
  return (
    <div className={cn(
      "relative overflow-hidden flex items-start gap-3 p-3 rounded-xl",
      "bg-card/80 backdrop-blur-md border shadow-sm",
      "transition-all duration-200 hover:shadow-md",
      borderColor
    )}>
      {/* Background gradient */}
      <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br to-transparent", iconBg)} />
      
      <div className={cn("relative p-2 rounded-lg shrink-0 shadow-sm", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
        <TrendIndicator value={change} label="vs min." />
      </div>
    </div>
  );
}

export function PeriodComparisonCard({ periodRange }: PeriodComparisonCardProps) {
  const { data, isLoading } = usePeriodComparison(periodRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Porovnání období</CardTitle>
          <span className="text-xs text-muted-foreground">
            {data.periodLabel} vs {data.previousPeriodLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricBox
            icon={Dumbbell}
            label="Tréninky"
            value={data.current.trainings}
            change={data.changes.trainings}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            borderColor="border-primary/20"
          />
          <MetricBox
            icon={Banknote}
            label="Příjem"
            value={formatCurrency(data.current.income, false)}
            change={data.changes.income}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-500/10"
            borderColor="border-emerald-500/20"
          />
          <MetricBox
            icon={Users}
            label="Aktivní klienti"
            value={data.current.activeClients}
            change={data.changes.activeClients}
            iconColor="text-accent"
            iconBg="bg-accent/10"
            borderColor="border-accent/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}
