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
