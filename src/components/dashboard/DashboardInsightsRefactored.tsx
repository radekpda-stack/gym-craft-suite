import { useState, useMemo, useCallback, memo } from 'react';
import { Lightbulb, ChevronRight, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { InsightDetailSheet } from './InsightDetailSheet';
import { generateDisplayedInsights } from './insights/insightGenerators';
import type { Insight, InsightGeneratorContext } from './insights/insightTypes';
import type { TrendData, FinanceMetrics, WeeklySummary, CapacityInfo } from '@/hooks/dashboard/types';
import type { ScheduleItem } from '@/types/training';

interface DashboardInsightsProps {
  trends: TrendData;
  finance: FinanceMetrics;
  weeklySummary: WeeklySummary;
  capacity: CapacityInfo;
  todaySchedule: ScheduleItem[];
  todayEstimatedIncome: number;
  isLoading?: boolean;
}

const getTypeStyles = (type: Insight['type']) => {
  switch (type) {
    case 'success':
      return 'bg-success/10 text-success border-success/20 hover:bg-success/15';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15';
    case 'info':
    default:
      return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15';
  }
};

export const DashboardInsightsRefactored = memo(function DashboardInsightsRefactored({
  trends,
  finance,
  weeklySummary,
  capacity,
  todaySchedule,
  todayEstimatedIncome,
  isLoading
}: DashboardInsightsProps) {
  const { language } = useLanguage();
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(() => Date.now());

  const handleRefresh = useCallback(() => {
    setShuffleSeed(Date.now());
  }, []);

  // Build context for insight generators
  const context = useMemo((): InsightGeneratorContext => ({
    language: language as 'cs' | 'en',
    trends: {
      cancellationRate: trends?.cancellationRate ?? 0,
      cancelledCount: trends?.cancelledCount ?? 0,
      retentionRate: trends?.retentionRate ?? 0,
      retainedClients: trends?.retainedClients ?? 0,
      lastMonthActiveClients: trends?.lastMonthActiveClients ?? 0,
      newClientsThisMonth: trends?.newClientsThisMonth ?? 0,
      activeClients: trends?.activeClients ?? 0,
      totalClients: trends?.totalClients ?? 0,
      topClientName: trends?.topClientName ?? '',
      topClientValue: trends?.topClientValue ?? 0,
      busiestDay: trends?.busiestDay ?? '',
      busiestDayCount: trends?.busiestDayCount ?? 0,
      hourDistribution: trends?.hourDistribution ?? [],
    },
    finance: {
      creditAtRisk: finance?.creditAtRisk ?? { count: 0, amount: 0 },
      unpaidTotal: finance?.unpaidTotal ?? { count: 0, amount: 0 },
      monthlyIncome: finance?.monthlyIncome ?? 0,
      lastMonthIncome: finance?.lastMonthIncome ?? 0,
      incomeChange: finance?.incomeChange ?? 0,
      avgPerTraining: finance?.avgPerTraining ?? 0,
      lastMonthAvgPerTraining: finance?.lastMonthAvgPerTraining ?? 0,
      trainingsWithPriceCount: finance?.trainingsWithPriceCount ?? 0,
      trainingsByParticipants: finance?.trainingsByParticipants ?? {
        solo: { count: 0, avgPrice: 0 },
        duo: { count: 0, avgPrice: 0 },
        group: { count: 0, avgPrice: 0 },
      },
    },
    weeklySummary: {
      trainingsThisWeek: weeklySummary?.trainingsThisWeek ?? 0,
      trainingsLastWeek: weeklySummary?.trainingsLastWeek ?? 0,
      incomeThisWeek: weeklySummary?.incomeThisWeek ?? 0,
      incomeLastWeek: weeklySummary?.incomeLastWeek ?? 0,
      weekTrend: weeklySummary?.weekTrend ?? 'stable',
      trainingsTrend: weeklySummary?.trainingsTrend ?? 'stable',
    },
    capacity: {
      completed: capacity?.completed ?? 0,
      scheduled: capacity?.scheduled ?? 0,
      total: capacity?.total ?? 0,
      percentUsed: capacity?.percentUsed ?? 0,
    },
    todayEstimatedIncome: todayEstimatedIncome ?? 0,
    todayScheduleCount: todaySchedule?.length ?? 0,
  }), [trends, finance, weeklySummary, capacity, todaySchedule, todayEstimatedIncome, language]);

  // Generate insights using refactored generators
  const displayedInsights = useMemo(() => 
    generateDisplayedInsights(context, shuffleSeed, 6),
    [context, shuffleSeed]
  );

  if (isLoading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-5 bg-muted rounded w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (displayedInsights.length === 0) {
    return null;
  }

  return (
    <>
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <h3 className="font-medium text-sm">
              {language === 'cs' ? 'Postřehy' : 'Insights'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {language === 'cs' ? 'Další' : 'More'}
          </Button>
        </div>
        
        <div className="grid gap-2">
          {displayedInsights.map(insight => (
            <button 
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border w-full text-left transition-all cursor-pointer ${getTypeStyles(insight.type)}`}
            >
              <span className="shrink-0">{insight.icon}</span>
              <span className="text-sm flex-1">{insight.text}</span>
              <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <InsightDetailSheet
        insight={selectedInsight}
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      />
    </>
  );
});

// Re-export for backwards compatibility
export { DashboardInsightsRefactored as DashboardInsights };
