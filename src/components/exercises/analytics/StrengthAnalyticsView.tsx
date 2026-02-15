import { useState } from 'react';
import { useExerciseAnalyticsComplete, type AnalyticsPeriod } from '@/hooks/useExerciseAnalyticsComplete';
import { useClientCardioComparison } from '@/hooks/useClientCardioComparison';
import { useClientSkillComparison } from '@/hooks/useClientSkillComparison';
import { AnalyticsFiltersBar } from './AnalyticsFiltersBar';
import { AnalyticsKPIRow } from './AnalyticsKPIRow';
import { AnalyticsInsightBar } from './AnalyticsInsightBar';
import { ClientProgressLeaderboardCard } from './ClientProgressLeaderboardCard';
import { ClientVolumeComparisonCard } from './ClientVolumeComparisonCard';
import { ClientWeightProgressionCard } from './ClientWeightProgressionCard';
import { ExercisePopularityByClientCard } from './ExercisePopularityByClientCard';
import { CardioClientComparisonCard } from './CardioClientComparisonCard';
import { SkillClientComparisonCard } from './SkillClientComparisonCard';
import { RPEByExerciseCard } from './RPEByExerciseCard';
import { RPEProgressCorrelationCard } from './RPEProgressCorrelationCard';
import { TopExercisesTable } from './TopExercisesTable';
import { GenderComparisonCard } from './GenderComparisonCard';
import { AgeGroupComparisonCard } from './AgeGroupComparisonCard';
import { WeightProgressionCard } from './WeightProgressionCard';
import { TopExercisesByGenderCard } from './TopExercisesByGenderCard';
import { useClients } from '@/hooks/useClients';

export function StrengthAnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(30);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [includeTests, setIncludeTests] = useState(false);

  const { data: clients = [] } = useClients();
  const { data, isLoading } = useExerciseAnalyticsComplete(period, selectedClientId, includeTests);
  const { data: cardioData = [], isLoading: cardioLoading } = useClientCardioComparison(period);
  const { data: skillData = [], isLoading: skillLoading } = useClientSkillComparison(period);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <AnalyticsFiltersBar
        period={period}
        onPeriodChange={setPeriod}
        clientId={selectedClientId}
        onClientChange={setSelectedClientId}
        clients={clients}
        includeTests={includeTests}
        onIncludeTestsChange={setIncludeTests}
      />

      {/* KPI Row */}
      <AnalyticsKPIRow kpi={data?.kpi} isLoading={isLoading} />

      {/* Insight Bar */}
      <AnalyticsInsightBar insight={data?.insight} isLoading={isLoading} />

      {/* Client Progress Leaderboard - Full Width */}
      <ClientProgressLeaderboardCard
        data={data?.clientProgressRanking || []}
        isLoading={isLoading}
      />

      {/* Client Volume + Client Weight Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ClientVolumeComparisonCard
          data={data?.clientVolumeComparison || []}
          isLoading={isLoading}
        />
        <ClientWeightProgressionCard
          data={data?.clientWeightProgression || []}
          isLoading={isLoading}
        />
      </div>

      {/* Gender & Age Comparison */}
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

      {/* Weight Progression (top exercises) - Full Width */}
      <WeightProgressionCard
        data={data?.weightProgression || []}
        isLoading={isLoading}
      />

      {/* Top Exercises by Gender + Exercise Popularity by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopExercisesByGenderCard
          data={data?.topExercisesByGender || { male: [], female: [] }}
          isLoading={isLoading}
        />
        <ExercisePopularityByClientCard
          data={data?.exerciseByClient || []}
          isLoading={isLoading}
        />
      </div>

      {/* Cardio + Skill Client Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardioClientComparisonCard
          data={cardioData}
          isLoading={cardioLoading}
        />
        <SkillClientComparisonCard
          data={skillData}
          isLoading={skillLoading}
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

      {/* Top Exercises Table */}
      <TopExercisesTable
        data={data?.topExercises || []}
        isLoading={isLoading}
        periodLabel={`${period === 'custom' ? 90 : period}d`}
      />
    </div>
  );
}
