import { useState } from 'react';
import { useExerciseAnalyticsNew, type AnalyticsPeriod, type ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';
import { AnalyticsKPICards } from './analytics/AnalyticsKPICards';
import { AnalyticsGrid, AnalyticsGridItem } from './analytics/AnalyticsGrid';
import { VolumeTimelineCard } from './analytics/VolumeTimelineCard';
import { LoadDistributionCard } from './analytics/LoadDistributionCard';
import { MovementPatternsCard } from './analytics/MovementPatternsCard';
import { UnusedExercisesCard } from './analytics/UnusedExercisesCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7 as AnalyticsPeriod, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
];

export function ExerciseAnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients = [] } = useClients();
  const { data, isLoading } = useExerciseAnalyticsNew(period, comparisonMode, selectedClientId);

  const handlePeriodChange = (value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setPeriod(numValue as AnalyticsPeriod);
    }
  };

  const handleClientChange = (value: string) => {
    if (value === 'all') {
      setSelectedClientId(null);
      setComparisonMode('all');
    } else {
      setSelectedClientId(value);
      setComparisonMode('client');
    }
  };

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '30 dní';

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Period Segmented Control */}
        <Tabs value={String(period)} onValueChange={handlePeriodChange} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            {PERIOD_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={String(opt.value)} className="text-xs sm:text-sm px-3">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Client Dropdown */}
        <Select value={selectedClientId || 'all'} onValueChange={handleClientChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Všichni klienti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni klienti</SelectItem>
            {clients
              .filter(c => !c.is_archived)
              .map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <AnalyticsKPICards data={data} isLoading={isLoading} />

      {/* Analytics Charts Grid */}
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
            coverage={data?.movementPatternsCoverage}
            totalEntries={data?.movementPatternsTotalEntries}
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
