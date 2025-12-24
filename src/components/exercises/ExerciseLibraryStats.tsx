import { useState } from 'react';
import { useExerciseAnalyticsNew, type AnalyticsPeriod, type ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';
import { AnalyticsHeader } from './analytics/AnalyticsHeader';
import { AnalyticsGrid, AnalyticsGridItem } from './analytics/AnalyticsGrid';
import { VolumeTimelineCard } from './analytics/VolumeTimelineCard';
import { LoadDistributionCard } from './analytics/LoadDistributionCard';
import { MovementPatternsCard } from './analytics/MovementPatternsCard';
import { UnusedExercisesCard } from './analytics/UnusedExercisesCard';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  30: '30 dní',
  90: '90 dní',
  custom: 'Vlastní',
};

export function ExerciseLibraryStats() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(90);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('all');

  const { data, isLoading } = useExerciseAnalyticsNew(period, comparisonMode);

  const periodLabel = PERIOD_LABELS[period];

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <AnalyticsHeader
        period={period}
        onPeriodChange={setPeriod}
        comparisonMode={comparisonMode}
        onComparisonModeChange={setComparisonMode}
      />

      {/* Analytics cards grid */}
      <AnalyticsGrid>
        {/* Volume Timeline - spans 2 columns */}
        <AnalyticsGridItem className="md:col-span-2">
          <VolumeTimelineCard
            data={data?.volumeTimeline || []}
            comparisonMode={comparisonMode}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>

        {/* Load Distribution */}
        <AnalyticsGridItem>
          <LoadDistributionCard
            data={data?.loadDistribution || []}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>

        {/* Movement Patterns */}
        <AnalyticsGridItem>
          <MovementPatternsCard
            data={data?.movementPatterns || []}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>

        {/* Unused Exercises - full width */}
        <AnalyticsGridItem className="md:col-span-2">
          <UnusedExercisesCard
            data={data?.unusedExercises || []}
            periodLabel={periodLabel}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>
      </AnalyticsGrid>
    </div>
  );
}
