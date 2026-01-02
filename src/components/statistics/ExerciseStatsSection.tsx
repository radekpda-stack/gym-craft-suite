import { useState } from 'react';
import { useAnnualStats } from '@/hooks/useAnnualStats';
import { useTrainingIntensityStats } from '@/hooks/useTrainingIntensityStats';
import { InsightsBar, generateExerciseInsights } from './InsightsBar';
import { RecentPRsList, useMonthlyPRCount } from './RecentPRsList';
import { Loader2, Activity, Trophy, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PRsDetailModal } from './modals/PRsDetailModal';
import { IntensityDetailModal } from './modals/IntensityDetailModal';
import { Card } from '@/components/ui/card';
import { VolumeStatsCard } from './VolumeStatsCard';
import { CardioStatsCard } from './CardioStatsCard';
import { StatInfoTooltip } from './StatInfoTooltip';

export function ExerciseStatsSection() {
  const { data: stats, isLoading } = useAnnualStats('year');
  const { data: intensityStats, isLoading: intensityLoading } = useTrainingIntensityStats();
  const { data: monthlyPRs } = useMonthlyPRCount();
  const [showPRsModal, setShowPRsModal] = useState(false);
  const [showIntensityModal, setShowIntensityModal] = useState(false);

  // Generate insights
  const insights = generateExerciseInsights(stats);

  if (isLoading || intensityLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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

  const avgRPE = intensityStats?.avgRPE;
  const totalPRs = stats?.totalPRs || 0;

  const getIntensityLabel = (rpe: number) => {
    if (rpe >= 8) return { label: 'Vysoká', color: 'text-red-500' };
    if (rpe >= 6) return { label: 'Střední', color: 'text-amber-500' };
    return { label: 'Nízká', color: 'text-green-500' };
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Insight Bar */}
      {insights.length > 0 && (
        <InsightsBar insights={insights} />
      )}

      {/* Hero KPI Cards - 2 metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* RPE Card */}
        <Card 
          className="p-4 sm:p-5 cursor-pointer hover:bg-accent/50 transition-colors group"
          onClick={() => setShowIntensityModal(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Ø Intenzita</p>
                <StatInfoTooltip
                  title="Průměrná intenzita (RPE)"
                  description="Průměrná vnímaná náročnost tréninků na škále 1-10."
                  calculation="Průměr hodnot RPE ze všech dokončených tréninků, kde bylo RPE zadáno."
                />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold">
                  {avgRPE ? avgRPE.toFixed(1) : '—'}
                </span>
                <span className="text-sm text-muted-foreground">RPE</span>
              </div>
              {avgRPE && (
                <p className={`text-xs mt-1 ${getIntensityLabel(avgRPE).color}`}>
                  {getIntensityLabel(avgRPE).label} intenzita
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors mt-2" />
          </div>
        </Card>

        {/* PRs Card */}
        <Card 
          className="p-4 sm:p-5 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowPRsModal(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Osobní rekordy</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-bold">
                  {monthlyPRs || 0}
                </span>
                <span className="text-sm text-muted-foreground">tento měsíc</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPRs} celkem
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Volume Stats */}
      <VolumeStatsCard />

      {/* Cardio Stats */}
      <CardioStatsCard />

      {/* Recent PRs List */}
      <RecentPRsList 
        limit={5}
        onViewAll={() => setShowPRsModal(true)}
      />

      {/* Modals */}
      <PRsDetailModal 
        open={showPRsModal} 
        onOpenChange={setShowPRsModal}
        stats={stats}
      />
      <IntensityDetailModal
        open={showIntensityModal}
        onOpenChange={setShowIntensityModal}
      />
    </div>
  );
}
