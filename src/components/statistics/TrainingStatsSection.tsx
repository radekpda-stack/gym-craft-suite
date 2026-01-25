import { useState, useMemo } from 'react';
import { useGlobalTrainingTagStats, GlobalDateRange } from '@/hooks/useGlobalTrainingTagStats';
import { useTrainingHeatmap } from '@/hooks/useTrainingHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { TrainingHeroKPI } from './TrainingHeroKPI';
import { TrainingTypeDistributionCard } from './TrainingTypeDistributionCard';
import { TrainingDurationCard } from './TrainingDurationCard';
import { GlobalTagDistributionCard } from './GlobalTagDistributionCard';
import { InteractiveHeatmapCard } from './InteractiveHeatmapCard';
import { HeatmapSummary } from './HeatmapSummary';
import { FeedbackTagCorrelation } from '@/components/feedback/FeedbackTagCorrelation';
import type { StatsPeriodRange } from './StatsPeriodSelector';
import { differenceInDays, subMonths } from 'date-fns';

interface TrainingStatsSectionProps {
  periodRange?: StatsPeriodRange;
}

export function TrainingStatsSection({ periodRange }: TrainingStatsSectionProps) {
  // Convert periodRange to GlobalDateRange (number of days or 'all')
  const dateRange = useMemo<GlobalDateRange>(() => {
    if (!periodRange) return 365;
    if (periodRange.type === 'all') return 'all';
    
    // Calculate days from the period range
    const days = differenceInDays(periodRange.end, periodRange.start);
    return days as GlobalDateRange;
  }, [periodRange]);
  
  const stats = useGlobalTrainingTagStats(dateRange);
  
  // Get heatmap data for summary
  const { data: heatmapData } = useTrainingHeatmap('3months');

  // Calculate trend vs previous period (simplified: vs previous month)
  const trendVsPrevious = useMemo(() => {
    if (!stats.trainingsThisMonth) return undefined;
    
    // For now, we estimate previous month from avg per week * 4
    const estimatedPreviousMonth = stats.avgTrainingsPerWeek * 4;
    if (estimatedPreviousMonth === 0) return undefined;
    
    const change = Math.round(((stats.trainingsThisMonth - estimatedPreviousMonth) / estimatedPreviousMonth) * 100);
    
    return {
      value: change,
      label: 'vs průměr'
    };
  }, [stats.trainingsThisMonth, stats.avgTrainingsPerWeek]);

  if (stats.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Hero KPI Cards with trend */}
      <TrainingHeroKPI
        totalTrainings={stats.totalTrainings}
        trainingsThisMonth={stats.trainingsThisMonth}
        avgPerWeek={stats.avgTrainingsPerWeek}
        mostFrequentType={stats.mostFrequentType}
        trendVsPrevious={trendVsPrevious}
      />

      {/* Training Type Distribution and Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrainingTypeDistributionCard distribution={stats.trainingTypeDistribution} />
        <TrainingDurationCard />
      </div>

      {/* Heatmap Summary - extracted insights */}
      {heatmapData && (
        <HeatmapSummary 
          busiestSlot={heatmapData.busiestSlot} 
          totalTrainings={heatmapData.totalTrainings} 
        />
      )}

      {/* Interactive Heatmap */}
      <InteractiveHeatmapCard />

      {/* Tag Distribution */}
      <GlobalTagDistributionCard
        focusDistribution={stats.focusDistribution}
        bodyPartDistribution={stats.bodyPartDistribution}
        intensityDistribution={stats.intensityDistribution}
      />

      {/* Feedback by Training Tags - correlates feedback with tag types */}
      <FeedbackTagCorrelation 
        days={dateRange === 'all' ? 365 : (typeof dateRange === 'number' ? dateRange : 90)} 
      />
    </div>
  );
}
