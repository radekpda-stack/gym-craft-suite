import { useState, useMemo } from 'react';
import { useGlobalTrainingTagStats, GlobalDateRange } from '@/hooks/useGlobalTrainingTagStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { TrainingHeroKPI } from './TrainingHeroKPI';
import { TrainingTypeDistributionCard } from './TrainingTypeDistributionCard';
import { TrainingDurationCard } from './TrainingDurationCard';
import { GlobalTagDistributionCard } from './GlobalTagDistributionCard';
import { InteractiveHeatmapCard } from './InteractiveHeatmapCard';
import type { StatsPeriodRange } from './StatsPeriodSelector';
import { differenceInDays } from 'date-fns';

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
      {/* Hero KPI Cards */}
      <TrainingHeroKPI
        totalTrainings={stats.totalTrainings}
        trainingsThisMonth={stats.trainingsThisMonth}
        avgPerWeek={stats.avgTrainingsPerWeek}
        mostFrequentType={stats.mostFrequentType}
      />

      {/* Training Type Distribution and Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrainingTypeDistributionCard distribution={stats.trainingTypeDistribution} />
        <TrainingDurationCard />
      </div>

      {/* Interactive Heatmap */}
      <InteractiveHeatmapCard />

      {/* Tag Distribution */}
      <GlobalTagDistributionCard
        focusDistribution={stats.focusDistribution}
        bodyPartDistribution={stats.bodyPartDistribution}
        intensityDistribution={stats.intensityDistribution}
      />
    </div>
  );
}
