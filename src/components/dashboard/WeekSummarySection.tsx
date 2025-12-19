import { useState } from 'react';
import { 
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel } from '@/hooks/useDashboardViewModel';

interface WeekSummarySectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-[hsl(142_76%_36%)]" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export function WeekSummarySection({ data, isLoading }: WeekSummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { weeklySummary } = data;
  
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  const trainingsChange = getChangePercent(weeklySummary.trainingsThisWeek, weeklySummary.trainingsLastWeek);
  const incomeChange = getChangePercent(weeklySummary.incomeThisWeek, weeklySummary.incomeLastWeek);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Týdenní přehled
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Trainings */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/20">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/50">
                <Dumbbell className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Tréninky</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {weeklySummary.trainingsThisWeek}
                  </span>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={weeklySummary.trainingsTrend} />
                    <span className={cn(
                      'text-xs font-medium',
                      weeklySummary.trainingsTrend === 'up' ? 'text-[hsl(142_76%_36%)]' :
                      weeklySummary.trainingsTrend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {trainingsChange > 0 ? '+' : ''}{trainingsChange}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  vs {weeklySummary.trainingsLastWeek} minulý týden
                </p>
              </div>
            </div>
            
            {/* Income */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/20">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/50">
                <Wallet className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Příjem</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {formatCurrency(weeklySummary.incomeThisWeek)}
                  </span>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={weeklySummary.weekTrend} />
                    <span className={cn(
                      'text-xs font-medium',
                      weeklySummary.weekTrend === 'up' ? 'text-[hsl(142_76%_36%)]' :
                      weeklySummary.weekTrend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      {incomeChange > 0 ? '+' : ''}{incomeChange}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  vs {formatCurrency(weeklySummary.incomeLastWeek)} minulý týden
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
