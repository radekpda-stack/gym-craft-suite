import { useState } from 'react';
import { useExerciseAnalyticsNew, type AnalyticsPeriod, type ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';
import { AnalyticsKPICards } from './analytics/AnalyticsKPICards';
import { AnalyticsGrid, AnalyticsGridItem } from './analytics/AnalyticsGrid';
import { VolumeTimelineCard } from './analytics/VolumeTimelineCard';
import { LoadDistributionCard } from './analytics/LoadDistributionCard';
import { MovementPatternsCard } from './analytics/MovementPatternsCard';
import { TopExercisesCard } from './analytics/TopExercisesCard';
import { PRTrendCard } from './analytics/PRTrendCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 7 as AnalyticsPeriod, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
];

// Help texts for analytics cards
const HELP_TEXTS = {
  volume: 'Týdenní souhrn tréninkového objemu (sets × reps × kg). Čárkovaná čára = průměr všech klientů.',
  loadDistribution: 'Procentuální rozložení objemu mezi svalovými skupinami. Výběr = vybraní klienti, Průměr = celá databáze.',
  movementPatterns: 'Které pohybové vzorce (squat, hinge, push, pull...) se v tréninku objevují nejčastěji.',
};

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
    if (!value) {
      setSelectedClientId(null);
      setComparisonMode('all');
    } else {
      setSelectedClientId(value);
      setComparisonMode('client');
    }
  };

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '30 dní';
  const periodDays = typeof period === 'number' ? period : 90;

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
        <ClientSearchSelect
          clients={clients}
          value={selectedClientId || ''}
          onValueChange={handleClientChange}
          placeholder="Všichni klienti"
          allowAll
          allLabel="Všichni klienti"
          filterArchived
          className="w-full sm:w-[180px]"
        />
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
            helpText={HELP_TEXTS.volume}
          />
        </AnalyticsGridItem>

        {/* PR Trend Card */}
        <AnalyticsGridItem>
          <PRTrendCard
            days={periodDays}
            clientId={selectedClientId}
            isLoading={isLoading}
          />
        </AnalyticsGridItem>

        {/* Load Distribution */}
        <AnalyticsGridItem>
          <LoadDistributionCard
            data={data?.loadDistribution || []}
            detailData={data?.loadDistributionDetail || []}
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
