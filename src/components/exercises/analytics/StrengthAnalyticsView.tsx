import { useState } from 'react';
import { useExerciseAnalyticsComplete, type AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';
import { AnalyticsFiltersBar } from './AnalyticsFiltersBar';
import { AnalyticsKPIRow } from './AnalyticsKPIRow';
import { AnalyticsInsightBar } from './AnalyticsInsightBar';
import { VolumeTimelineCardNew } from './VolumeTimelineCardNew';
import { PRTimelineCardNew } from './PRTimelineCardNew';
import { RpeTimelineCard } from './RpeTimelineCard';
import { LoadDistributionCard } from './LoadDistributionCard';
import { MovementPatternsCard } from './MovementPatternsCard';
import { TopExercisesTable } from './TopExercisesTable';
import { AnalyticsGrid, AnalyticsGridItem } from './AnalyticsGrid';
import { useClients } from '@/hooks/useClients';

export function StrengthAnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [includeTests, setIncludeTests] = useState(false);

  const { data: clients = [] } = useClients();
  const { data, isLoading } = useExerciseAnalyticsComplete(period, selectedClientId, includeTests);

  const handlePeriodChange = (value: AnalyticsPeriod) => {
    setPeriod(value);
  };

  const handleClientChange = (value: string | null) => {
    setSelectedClientId(value);
  };

  return (
    <div className="space-y-4">
      {/* Sticky Top Bar - Filters */}
      <AnalyticsFiltersBar
        period={period}
        onPeriodChange={handlePeriodChange}
        clientId={selectedClientId}
        onClientChange={handleClientChange}
        clients={clients}
        includeTests={includeTests}
        onIncludeTestsChange={setIncludeTests}
      />

      {/* KPI Row - 4 hlavní + 1 sekundární */}
      <AnalyticsKPIRow 
        kpi={data?.kpi} 
        isLoading={isLoading} 
      />

      {/* Insight Bar */}
      <AnalyticsInsightBar 
        insight={data?.insight} 
        isLoading={isLoading} 
      />

      {/* 3 Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <VolumeTimelineCardNew
          data={data?.volumeTimeline || []}
          isLoading={isLoading}
        />
        <PRTimelineCardNew
          data={data?.prTimeline || []}
          isLoading={isLoading}
        />
        <RpeTimelineCard
          data={data?.rpeTimeline || []}
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Blocks - Load Distribution & Movement Patterns */}
      <AnalyticsGrid>
        <AnalyticsGridItem>
          <LoadDistributionCard
            data={data?.loadDistribution?.map(d => ({
              ...d,
              comparisonValue: 0, // No comparison in simplified view
            })) || []}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>
        <AnalyticsGridItem>
          <MovementPatternsCard
            data={data?.movementPatterns?.map(p => ({
              ...p,
              totalEntries: data?.kpi?.tonnage ? 100 : 0,
              coverage: 100,
            })) || []}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>
      </AnalyticsGrid>

      {/* Top Exercises Table */}
      <TopExercisesTable
        data={data?.topExercises || []}
        isLoading={isLoading}
        periodLabel={`${period === 'custom' ? 90 : period}d`}
      />
    </div>
  );
}
