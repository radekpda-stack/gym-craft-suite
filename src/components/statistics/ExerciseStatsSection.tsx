import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useGenderStats } from '@/hooks/useGenderStats';
import { HeroKPIGrid, KPICard } from './HeroKPIGrid';
import { InsightsBar, generateExerciseInsights } from './InsightsBar';
import { TopExercisesCard } from './TopExercisesCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { ExerciseBodyPartCard } from './ExerciseBodyPartCard';
import { RecordWeightsCard } from './RecordWeightsCard';
import { StrengthProgressCard } from './StrengthProgressCard';
import { Trophy, Zap, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRsDetailModal } from './modals/PRsDetailModal';
import { MaxWeightModal } from './modals/MaxWeightModal';

type ExerciseModal = 'prs' | 'maxweight' | null;

export function ExerciseStatsSection() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useAnnualStats('year');
  const { data: genderStats } = useGenderStats();
  const [activeModal, setActiveModal] = useState<ExerciseModal>(null);

  // Generate insights
  const insights = generateExerciseInsights(stats);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(2)].map((_, i) => (
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
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Hero KPI Cards - reduced to 2 main KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <KPICard
          title="Osobní rekordy"
          value={totalPRs}
          subtitle={`${prRate}% ze záznamů`}
          icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="success"
          onClick={() => setActiveModal('prs')}
          clickable
        />
        <KPICard
          title="Max váha"
          value={stats?.maxWeightLifted?.weight ? `${stats.maxWeightLifted.weight} kg` : '-'}
          subtitle={stats?.maxWeightLifted ? `${stats.maxWeightLifted.exercise} • ${stats.maxWeightLifted.client}` : 'žádný záznam'}
          icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
          variant="destructive"
          onClick={() => setActiveModal('maxweight')}
          clickable
        />
      </div>

      {/* Secondary stats - moved to collapsible detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Přehled záznamů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalExercises.toLocaleString('cs-CZ')}</p>
              <p className="text-xs text-muted-foreground">záznamů cviků</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueExercises}</p>
              <p className="text-xs text-muted-foreground">různých cviků</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.topExercises?.[0]?.count || 0}×</p>
              <p className="text-xs text-muted-foreground truncate" title={stats?.topExercises?.[0]?.name}>
                {stats?.topExercises?.[0]?.name || 'nejčastější cvik'}
              </p>
            </div>
            <div 
              className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => navigate('/exercises')}
            >
              <p className="text-2xl font-bold text-primary">→</p>
              <p className="text-xs text-muted-foreground">Knihovna cviků</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
      <PRsDetailModal 
        open={activeModal === 'prs'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
        genderStats={genderStats?.prsByGender}
      />
      <MaxWeightModal 
        open={activeModal === 'maxweight'} 
        onOpenChange={(open) => !open && setActiveModal(null)}
        stats={stats}
      />
    </div>
  );
}
