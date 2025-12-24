import { useExerciseLibraryStats } from '@/hooks/useExerciseLibraryStats';
import { MuscularLoadChart } from './MuscularLoadChart';
import { TopExercisesWidget } from './TopExercisesWidget';
import { ActivityTrendCard } from './ActivityTrendCard';
import { MovementPatternCoverage } from './MovementPatternCoverage';
import { VolumeStatsCard } from './VolumeStatsCard';
import { ActiveExercisesCard } from './ActiveExercisesCard';

export function ExerciseLibraryStats() {
  const { data, isLoading } = useExerciseLibraryStats();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <div className="col-span-2 md:col-span-1 lg:col-span-2">
        <MuscularLoadChart 
          data={data?.categoryDistribution || []} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="col-span-2 md:col-span-2 lg:col-span-2">
        <TopExercisesWidget 
          data={data?.topExercises || []} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="col-span-1">
        <ActivityTrendCard
          currentMonth={data?.currentMonthSessions || 0}
          lastMonth={data?.lastMonthSessions || 0}
          trendPercent={data?.activityTrendPercent || 0}
          isLoading={isLoading}
        />
      </div>
      
      <div className="col-span-1">
        <VolumeStatsCard
          totalVolume={data?.totalVolume || 0}
          volumeTrend={data?.volumeTrend || []}
          isLoading={isLoading}
        />
      </div>
      
      <div className="col-span-1 md:col-span-2 lg:col-span-1">
        <MovementPatternCoverage 
          data={data?.movementPatterns || []} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="col-span-1">
        <ActiveExercisesCard
          activeCount={data?.activeExercisesCount || 0}
          totalCount={data?.totalExercisesCount || 0}
          percentage={data?.activePercentage || 0}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
