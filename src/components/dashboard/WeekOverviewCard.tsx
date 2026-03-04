import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Calendar, Banknote, 
  BarChart3, ChevronDown, AlertCircle, Wallet 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { FinanceMetrics, WeeklySummary } from '@/types/dashboard';
import { useCashflowForecast } from '@/hooks/useCashflowForecast';
import { useIsMobile } from '@/hooks/use-mobile';

interface WeekOverviewCardProps {
  finance: FinanceMetrics;
  weeklySummary: WeeklySummary;
  isLoading?: boolean;
}

const TrendIcon = ({ value, size = 3 }: { value: number; size?: number }) => {
  if (value > 0) return <TrendingUp className={`w-${size} h-${size} text-success`} />;
  if (value < 0) return <TrendingDown className={`w-${size} h-${size} text-destructive`} />;
  return <Minus className={`w-${size} h-${size} text-muted-foreground`} />;
};

const MetricTile = memo(function MetricTile({ 
  icon: Icon, label, value, change, color, delay = 0 
}: { 
  icon: typeof Calendar; label: string; value: string | number; 
  change?: number; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 min-w-[130px] flex-shrink-0 snap-start sm:min-w-0 sm:flex-shrink"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold tabular-nums text-foreground truncate">{value}</p>
      {change !== undefined && change !== 0 && (
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon value={change} />
          <span className={cn(
            'text-xs font-medium',
            change > 0 ? 'text-success' : 'text-destructive'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        </div>
      )}
    </motion.div>
  );
});

export const WeekOverviewCard = memo(function WeekOverviewCard({
  finance, weeklySummary, isLoading,
}: WeekOverviewCardProps) {
  const [showForecast, setShowForecast] = useState(false);
  const { data: cashflow } = useCashflowForecast();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const weeklyChange = weeklySummary.incomeLastWeek > 0
    ? Math.round(((weeklySummary.incomeThisWeek - weeklySummary.incomeLastWeek) / weeklySummary.incomeLastWeek) * 100)
    : 0;

  const trainingsChange = weeklySummary.trainingsLastWeek > 0
    ? Math.round(((weeklySummary.trainingsThisWeek - weeklySummary.trainingsLastWeek) / weeklySummary.trainingsLastWeek) * 100)
    : 0;

  // Financial alerts removed - now handled exclusively by ActionCenterCard
  return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Přehled
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              vs. minulý týden
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main metrics grid */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 -mx-1 px-1 pb-1 scrollbar-hide sm:grid sm:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
            <MetricTile
              icon={Calendar}
              label="Tréninky"
              value={weeklySummary.trainingsThisWeek}
              change={trainingsChange}
              color="text-primary"
              delay={0}
            />
            <MetricTile
              icon={Banknote}
              label="Týdenní příjem"
              value={formatCurrency(weeklySummary.incomeThisWeek)}
              change={weeklyChange}
              color="text-success"
              delay={0.05}
            />
            <MetricTile
              icon={Banknote}
              label="Měsíční příjem"
              value={formatCurrency(finance.monthlyIncome)}
              change={finance.incomeChange}
              color="text-success"
              delay={0.1}
            />
            <MetricTile
              icon={BarChart3}
              label="⌀ za trénink"
              value={formatCurrency(finance.avgPerTraining)}
              color="text-muted-foreground"
              delay={0.15}
            />
          </div>

          {/* Cashflow forecast - collapsible */}
          {cashflow && (
            <Collapsible open={showForecast} onOpenChange={setShowForecast}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-between px-3"
                >
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    Cashflow předpověď
                  </span>
                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 transition-transform',
                    showForecast && 'rotate-180'
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-1">Tento týden</p>
                    <p className="text-sm font-bold">{formatCurrency(cashflow.thisWeek.expected)}</p>
                    <p className="text-[10px] text-muted-foreground">{cashflow.thisWeek.trainingsCount} tréninků</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50">
                    <p className="text-[10px] text-muted-foreground mb-1">Příští týden</p>
                    <p className="text-sm font-bold">{formatCurrency(cashflow.nextWeek.expected)}</p>
                    <p className="text-[10px] text-muted-foreground">{cashflow.nextWeek.trainingsCount} tréninků</p>
                  </div>
                </div>
                {cashflow.receivables.total > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-warning/5 border border-warning/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-warning" />
                      <span className="text-xs font-medium text-warning">Pohledávky</span>
                    </div>
                    <span className="text-xs font-bold text-warning">{formatCurrency(cashflow.receivables.total)}</span>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
  );
});
