import { useState } from 'react';
import { useExerciseAnalyticsNew, type AnalyticsPeriod, type ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';
import { AnalyticsHeader } from './analytics/AnalyticsHeader';
import { AnalyticsGrid, AnalyticsGridItem } from './analytics/AnalyticsGrid';
import { VolumeTimelineCard } from './analytics/VolumeTimelineCard';
import { LoadDistributionCard } from './analytics/LoadDistributionCard';
import { MovementPatternsCard } from './analytics/MovementPatternsCard';
import { TopExercisesCard } from './analytics/TopExercisesCard';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  7: '7 dní',
  30: '30 dní',
  90: '90 dní',
  custom: 'Vlastní',
};

// Help texts for analytics cards
const HELP_TEXTS = {
  volume: 'Týdenní souhrn tréninkového objemu (sets × reps × kg). Čárkovaná čára = průměr všech klientů.',
  loadDistribution: 'Procentuální rozložení objemu mezi svalovými skupinami. Výběr = vybraní klienti, Průměr = celá databáze.',
  movementPatterns: 'Které pohybové vzorce (squat, hinge, push, pull...) se v tréninku objevují nejčastěji.',
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
            helpText={HELP_TEXTS.volume}
          />
        </AnalyticsGridItem>

        {/* Load Distribution */}
        <AnalyticsGridItem>
          <LoadDistributionCard
            data={data?.loadDistribution || []}
            isLoading={isLoading}
            helpText={HELP_TEXTS.loadDistribution}
          />
        </AnalyticsGridItem>

        {/* Movement Patterns */}
        <AnalyticsGridItem>
          <MovementPatternsCard
            data={data?.movementPatterns || []}
            coverage={data?.movementPatternsCoverage}
            totalEntries={data?.movementPatternsTotalEntries}
            isLoading={isLoading}
            helpText={HELP_TEXTS.movementPatterns}
          />
        </AnalyticsGridItem>

        {/* Top Exercises - full width */}
        <AnalyticsGridItem className="md:col-span-2">
          <TopExercisesCard
            data={data?.topExercises || []}
            periodLabel={periodLabel}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>
      </AnalyticsGrid>
    </div>
  );
}

