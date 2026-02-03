import { useState, useMemo, useCallback, memo } from 'react';
import { Lightbulb, ChevronRight, RefreshCw, TrendingUp, TrendingDown, Users, Clock, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InsightDetailSheet } from './InsightDetailSheet';
import { generateDisplayedInsights } from './insights/insightGenerators';
import type { Insight, InsightGeneratorContext } from './insights/insightTypes';
import type { TrendData, FinanceMetrics, WeeklySummary, CapacityInfo } from '@/hooks/dashboard/types';
import type { ScheduleItem } from '@/types/training';
import { cn } from '@/lib/utils';

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
      return {
        bg: 'bg-success/10 hover:bg-success/15',
        border: 'border-success/20',
        text: 'text-success',
        icon: 'bg-success/20',
      };
    case 'warning':
      return {
        bg: 'bg-warning/10 hover:bg-warning/15',
        border: 'border-warning/20',
        text: 'text-warning',
        icon: 'bg-warning/20',
      };
    case 'info':
    default:
      return {
        bg: 'bg-primary/10 hover:bg-primary/15',
        border: 'border-primary/20',
        text: 'text-primary',
        icon: 'bg-primary/20',
      };
  }
};

const getInsightIcon = (iconEmoji: string, type: Insight['type']) => {
  // Map common emoji to Lucide icons
  if (iconEmoji.includes('📈') || iconEmoji.includes('⬆')) return TrendingUp;
  if (iconEmoji.includes('📉') || iconEmoji.includes('⬇')) return TrendingDown;
  if (iconEmoji.includes('👥') || iconEmoji.includes('🧑')) return Users;
  if (iconEmoji.includes('⏰') || iconEmoji.includes('🕐')) return Clock;
  if (iconEmoji.includes('🎯')) return Target;
  if (iconEmoji.includes('⚡') || iconEmoji.includes('💪')) return Zap;
  return Lightbulb;
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
    generateDisplayedInsights(context, shuffleSeed, 4),
    [context, shuffleSeed]
  );

  if (isLoading) {
    return (
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-24 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayedInsights.length === 0) {
    return null;
  }

  return (
    <>
      <Card variant="floating" className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10">
                <Lightbulb className="w-4 h-4 text-warning" />
              </div>
              <span>{language === 'cs' ? 'Postřehy' : 'Insights'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {language === 'cs' ? 'Další' : 'More'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayedInsights.map((insight, index) => {
              const styles = getTypeStyles(insight.type);
              const IconComponent = getInsightIcon(String(insight.icon), insight.type);
              
              return (
                <motion.button 
                  key={insight.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedInsight(insight)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border w-full text-left transition-all',
                    styles.bg,
                    styles.border
                  )}
                >
                  <div className={cn(
                    'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                    styles.icon
                  )}>
                    <IconComponent className={cn('w-5 h-5', styles.text)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', styles.text)}>
                      {insight.text}
                    </p>
                  </div>
                  
                  <ChevronRight className={cn('w-4 h-4 shrink-0 opacity-60', styles.text)} />
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
