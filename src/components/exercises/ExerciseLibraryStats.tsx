import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useExerciseAnalyticsNew, type AnalyticsPeriod, type ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';
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
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={String(period)}
          onValueChange={(v) => v && setPeriod(v === 'custom' ? 'custom' : Number(v) as AnalyticsPeriod)}
        >
          <ToggleGroupItem value="30" className="text-xs">
            30 dní
          </ToggleGroupItem>
          <ToggleGroupItem value="90" className="text-xs">
            90 dní
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Analytics cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Volume Timeline - spans 2 columns */}
        <div className="md:col-span-2">
          <VolumeTimelineCard
            data={data?.volumeTimeline || []}
            totalVolume={data?.totalVolume || 0}
            comparisonMode={comparisonMode}
            onComparisonModeChange={setComparisonMode}
            isLoading={isLoading}
          />
        </div>

        {/* Load Distribution */}
        <LoadDistributionCard
          data={data?.loadDistribution || []}
          isLoading={isLoading}
        />

        {/* Movement Patterns */}
        <MovementPatternsCard
          data={data?.movementPatterns || []}
          isLoading={isLoading}
        />

        {/* Unused Exercises - full width on mobile, 2 cols on larger */}
        <div className="md:col-span-2 lg:col-span-2">
          <UnusedExercisesCard
            data={data?.unusedExercises || []}
            periodLabel={periodLabel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
