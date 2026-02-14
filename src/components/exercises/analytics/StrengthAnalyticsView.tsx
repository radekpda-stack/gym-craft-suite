import { useState } from 'react';
import { useExerciseAnalyticsComplete, type AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';
import { AnalyticsFiltersBar } from './AnalyticsFiltersBar';
import { AnalyticsKPIRow } from './AnalyticsKPIRow';
import { AnalyticsInsightBar } from './AnalyticsInsightBar';
import { StagnationAlertCard } from './StagnationAlertCard';
import { MovementGapsCard } from './MovementGapsCard';
import { UnusedExercisesCard } from './UnusedExercisesCard';
import { ClientAttentionCard } from './ClientAttentionCard';
import { RPEByExerciseCard } from './RPEByExerciseCard';
import { RPEProgressCorrelationCard } from './RPEProgressCorrelationCard';
import { TopExercisesTable } from './TopExercisesTable';
import { GenderComparisonCard } from './GenderComparisonCard';
import { AgeGroupComparisonCard } from './AgeGroupComparisonCard';
import { WeightProgressionCard } from './WeightProgressionCard';
import { TopExercisesByGenderCard } from './TopExercisesByGenderCard';
import { PRDistributionCard } from './PRDistributionCard';
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

      {/* KPI Row */}
      <AnalyticsKPIRow 
        kpi={data?.kpi} 
        isLoading={isLoading} 
      />

      {/* Insight Bar */}
      <AnalyticsInsightBar 
        insight={data?.insight} 
        isLoading={isLoading} 
      />

      {/* 3 Trainer-focused Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StagnationAlertCard
          data={data?.stagnatingClients || []}
          isLoading={isLoading}
        />
        <MovementGapsCard
          data={data?.movementGaps || []}
          isLoading={isLoading}
        />
        <UnusedExercisesCard
          data={data?.unusedExercises || []}
          totalExercises={data?.totalExercisesInLibrary}
          isLoading={isLoading}
        />
      </div>

      {/* Gender & Age Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GenderComparisonCard
          data={data?.genderComparison || { male: { avgWeight: 0, maxWeight: 0, tonnage: 0, prCount: 0, entryCount: 0, clientCount: 0 }, female: { avgWeight: 0, maxWeight: 0, tonnage: 0, prCount: 0, entryCount: 0, clientCount: 0 } }}
          isLoading={isLoading}
        />
        <AgeGroupComparisonCard
          data={data?.ageGroupComparison || []}
          isLoading={isLoading}
        />
      </div>

      {/* Weight Progression - Full Width */}
      <WeightProgressionCard
        data={data?.weightProgression || []}
        isLoading={isLoading}
      />

      {/* Top Exercises by Gender & PR Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopExercisesByGenderCard
          data={data?.topExercisesByGender || { male: [], female: [] }}
          isLoading={isLoading}
        />
        <PRDistributionCard
          data={data?.prDistribution || []}
          isLoading={isLoading}
        />
      </div>

      {/* RPE Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RPEByExerciseCard
          data={data?.exerciseRpeRanking || []}
          isLoading={isLoading}
        />
        <RPEProgressCorrelationCard
          data={data?.rpeProgressCorrelation || []}
          isLoading={isLoading}
        />
      </div>

      {/* Clients Needing Attention - Full Width */}
      <ClientAttentionCard
        data={data?.clientsNeedingAttention || []}
        isLoading={isLoading}
      />

      {/* Top Exercises Table */}
      <TopExercisesTable
        data={data?.topExercises || []}
        isLoading={isLoading}
        periodLabel={`${period === 'custom' ? 90 : period}d`}
      />
    </div>
  );
}