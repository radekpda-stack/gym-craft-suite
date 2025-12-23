import { useState } from 'react';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useGenderStats } from '@/hooks/useGenderStats';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { TopExercisesCard } from './TopExercisesCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { ExerciseBodyPartCard } from './ExerciseBodyPartCard';
import { RecordWeightsCard } from './RecordWeightsCard';
import { StrengthProgressCard } from './StrengthProgressCard';
import { Dumbbell, Trophy, Zap, Target, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseCountModal } from './modals/ExerciseCountModal';
import { PRsDetailModal } from './modals/PRsDetailModal';
import { UniqueExercisesModal } from './modals/UniqueExercisesModal';
import { MaxWeightModal } from './modals/MaxWeightModal';

type ExerciseModal = 'count' | 'prs' | 'unique' | 'maxweight' | null;

export function ExerciseStatsSection() {
  const { data: stats, isLoading } = useAnnualStats('year');
  const { data: genderStats } = useGenderStats();
  const [activeModal, setActiveModal] = useState<ExerciseModal>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const totalExercises = stats?.totalExerciseEntries || 0;
  const uniqueExercises = stats?.uniqueExercises || 0;
  const totalPRs = stats?.totalPRs || 0;
  const prRate = totalExercises > 0 ? ((totalPRs / totalExercises) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Hero KPI Cards */}
      <HeroKPIGrid>
        <KPICard
          title="Zapsaných cviků"
          value={totalExercises.toLocaleString('cs-CZ')}
          subtitle="tento rok"
          icon={<Dumbbell className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="warning"
          onClick={() => setActiveModal('count')}
          clickable
        />
        <KPICard
          title="Osobní rekordy"
          value={totalPRs}
          subtitle={`${prRate}% úspěšnost`}
          icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="success"
          onClick={() => setActiveModal('prs')}
          clickable
        />
        <KPICard
          title="Unikátních cviků"
          value={uniqueExercises}
          subtitle="různých cviků"
          icon={<Target className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="primary"
          onClick={() => setActiveModal('unique')}
          clickable
        />
        <KPICard
          title="Max váha"
          value={stats?.maxWeightLifted?.weight ? `${stats.maxWeightLifted.weight} kg` : '-'}
          subtitle={stats?.maxWeightLifted?.exercise || 'žádný záznam'}
          icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="destructive"
          onClick={() => setActiveModal('maxweight')}
          clickable
        />
      </HeroKPIGrid>

      {/* PR Timeline */}
      <PRTimelineCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <TopExercisesCard />
        <ExerciseBodyPartCard />
        <RecordWeightsCard />
      </div>

      {/* Strength Progress */}
      <StrengthProgressCard />

      {/* Modals */}
      <ExerciseCountModal 
        open={activeModal === 'count'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
      <PRsDetailModal 
        open={activeModal === 'prs'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
        genderStats={genderStats?.prsByGender}
      />
      <UniqueExercisesModal 
        open={activeModal === 'unique'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
      <MaxWeightModal 
        open={activeModal === 'maxweight'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
    </div>
  );
}
