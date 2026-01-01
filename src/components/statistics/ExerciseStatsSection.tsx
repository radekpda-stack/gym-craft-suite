import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useGenderStats } from '@/hooks/useGenderStats';
import { InsightsBar, generateExerciseInsights } from './InsightsBar';
import { TopExercisesCard } from './TopExercisesCard';
import { PRTimelineCard } from '@/components/dashboard/PRTimelineCard';
import { ExerciseBodyPartCard } from './ExerciseBodyPartCard';
import { RecordWeightsCard } from './RecordWeightsCard';
import { StrengthProgressCard } from './StrengthProgressCard';
import { IntensityStatsCard } from './IntensityStatsCard';
import { TrainingTypesCard } from './TrainingTypesCard';
import { GaugeCard, SparklineCard, MetricCard } from '@/components/charts';
import { Trophy, Zap, Loader2, Dumbbell, TrendingUp } from 'lucide-react';
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

  // Generate sparkline data from PR counts by month (simulated from monthly trend)
  const prSparklineData = useMemo(() => {
    // Use monthly trend as proxy for PR velocity
    return (stats?.monthlyTrend || []).slice(-6).map(m => ({ 
      value: Math.round(m.trainings * 0.15) // Approximate PR rate
    }));
  }, [stats?.monthlyTrend]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
  const prRate = totalExercises > 0 ? (totalPRs / totalExercises) * 100 : 0;
  const maxWeight = stats?.maxWeightLifted?.weight || 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* WHOOP-style Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GaugeCard
          title="PR Rate"
          value={prRate}
          maxValue={20}
          displayValue={`${prRate.toFixed(1)}%`}
          sublabel="ze záznamů"
          description={`${totalPRs} osobních rekordů`}
          variant={prRate >= 10 ? 'success' : prRate >= 5 ? 'primary' : 'warning'}
          size="md"
          onClick={() => setActiveModal('prs')}
        />
        
        <GaugeCard
          title="Max váha"
          value={maxWeight}
          maxValue={200}
          displayValue={maxWeight > 0 ? `${maxWeight}` : '-'}
          sublabel="kg"
          description={stats?.maxWeightLifted ? `${stats.maxWeightLifted.exercise}` : 'žádný záznam'}
          variant="destructive"
          size="md"
          onClick={() => setActiveModal('maxweight')}
        />

        <SparklineCard
          title="Osobní rekordy"
          value={totalPRs}
          subtitle="tento rok"
          data={prSparklineData}
          variant="success"
          icon={<Trophy className="h-4 w-4" />}
          onClick={() => setActiveModal('prs')}
        />

        <MetricCard
          title="Různé cviky"
          value={uniqueExercises}
          subtitle={`z ${totalExercises.toLocaleString('cs-CZ')} záznamů`}
          progress={Math.min((uniqueExercises / 100) * 100, 100)}
          variant="purple"
          icon={<Dumbbell className="h-4 w-4" />}
          onClick={() => navigate('/exercises')}
          showProgressValue
        />
      </div>

      {/* Secondary stats */}
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

      {/* Intensity and Training Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <IntensityStatsCard />
        <TrainingTypesCard />
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
