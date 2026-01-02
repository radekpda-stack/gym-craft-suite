import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useTrainingIntensityStats } from '@/hooks/useTrainingIntensityStats';
import { InsightsBar, generateExerciseInsights } from './InsightsBar';
import { ExerciseHeroKPI } from './ExerciseHeroKPI';
import { RecentPRsList, useMonthlyPRCount } from './RecentPRsList';
import { ExerciseBodyPartCard } from './ExerciseBodyPartCard';
import { StrengthProgressCard } from './StrengthProgressCard';
import { IntensityStatsCard } from './IntensityStatsCard';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PRsDetailModal } from './modals/PRsDetailModal';
import { MaxWeightModal } from './modals/MaxWeightModal';

type ExerciseModal = 'prs' | 'maxweight' | null;

export function ExerciseStatsSection() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAnnualStats('year');
  const { data: intensityStats } = useTrainingIntensityStats();
  const { data: monthlyPRs } = useMonthlyPRCount();
  const [activeModal, setActiveModal] = useState<ExerciseModal>(null);

  // Generate insights
  const insights = generateExerciseInsights(stats);

  const handleCardClick = (card: string) => {
    switch (card) {
      case 'prs':
        setActiveModal('prs');
        break;
      case 'exercises':
        navigate('/exercises');
        break;
    }
  };

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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Hero KPI Cards */}
      <ExerciseHeroKPI
        stats={stats}
        monthlyPRs={monthlyPRs || 0}
        avgRPE={intensityStats?.avgRPE}
        onCardClick={handleCardClick}
      />

      {/* Recent PRs List */}
      <RecentPRsList 
        limit={5}
        onViewAll={() => setActiveModal('prs')}
      />

      {/* Strength Progress Chart */}
      <StrengthProgressCard />

      {/* Stats Grid - simplified to 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <ExerciseBodyPartCard />
        <IntensityStatsCard />
      </div>

      {/* Modals */}
      <PRsDetailModal 
        open={activeModal === 'prs'} 
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
