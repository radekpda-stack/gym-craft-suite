import { useEffect, useState } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  useClientWeightProgress, 
  useClientBodyFatProgress, 
  useClientCardioProgress,
  useClientPortalProgressSettings 
} from '@/hooks/useClientProgressData';
import { useClientAllExercises } from '@/hooks/useClientAllExercises';
import { 
  WeightChart, 
  BodyFatChart, 
  CombinedCardioChart, 
  AllExercisesChart,
  ClientPortalPaceTrendCard
} from '@/components/client-portal/progress';
import { ProgressSummaryCards } from '@/components/client-portal/progress/ProgressSummaryCards';
import { ClientPortalPRsCard } from '@/components/client-portal/progress/ClientPortalPRsCard';
import { ClientExerciseBenchmarks } from '@/components/client-portal/progress/ClientExerciseBenchmarks';
import { MeasurementsHistoryCard } from '@/components/client-portal/progress/MeasurementsHistoryCard';
import { PeriodFilter, type Period } from '@/components/client-portal/common/PeriodFilter';
import { Bike, PersonStanding, TrendingUp } from 'lucide-react';

export default function ClientPortalProgress() {
  const { clientAccount, clientId } = useClientPortal();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_progress');
  const [period, setPeriod] = useState<Period>('all');

  const trainerId = clientAccount?.trainer_id || null;
  const months = period === 'all' ? 24 : Math.ceil(period / 30);

  // Fetch visibility settings
  const { data: visibilitySettings, isLoading: settingsLoading } = useClientPortalProgressSettings(trainerId);

  // Fetch progress data with period
  const { data: weightData, isLoading: weightLoading } = useClientWeightProgress(clientId, months);
  const { data: bodyFatData, isLoading: bodyFatLoading } = useClientBodyFatProgress(clientId, months);
  const { data: allExercises, isLoading: exercisesLoading } = useClientAllExercises(clientId, months);
  
  // Cardio data
  const { data: rowing500Data, isLoading: rowing500Loading } = useClientCardioProgress(clientId, 'veslo', 500, months);
  const { data: rowing1000Data, isLoading: rowing1000Loading } = useClientCardioProgress(clientId, 'veslo', 1000, months);
  const { data: running500Data, isLoading: running500Loading } = useClientCardioProgress(clientId, 'běh', 500, months);
  const { data: running1000Data, isLoading: running1000Loading } = useClientCardioProgress(clientId, 'běh', 1000, months);

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  // Default metrics if not set
  const metrics = visibilitySettings?.progressMetrics || {
    weight: true,
    bodyFat: true,
    trackedExercises: true,
    rowing500m: true,
    rowing1000m: true,
    running500m: true,
    running1000m: true,
  };

  const showWeight = metrics.weight;
  const showBodyFat = metrics.bodyFat;
  const showExercises = metrics.trackedExercises;
  const showRowing500 = metrics.rowing500m;
  const showRowing1000 = metrics.rowing1000m;
  const showRunning500 = metrics.running500m;
  const showRunning1000 = metrics.running1000m;

  // Check if anything is visible
  const hasAnyVisible = showWeight || showBodyFat || showExercises || 
    showRowing500 || showRowing1000 || showRunning500 || showRunning1000;

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pokrok</h1>
          <p className="text-muted-foreground">Sleduj své zlepšení</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasAnyVisible) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pokrok</h1>
          <p className="text-muted-foreground">Sleduj své zlepšení</p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>Tvůj trenér zatím nenastavil žádné metriky k zobrazení.</p>
        </div>
      </div>
    );
  }

  const isDataLoading = weightLoading || bodyFatLoading || exercisesLoading;

  // Transform exercises for summary cards (compatible format)
  const exercisesForSummary = (allExercises || []).map(e => ({
    exerciseName: e.exerciseName,
    exerciseId: null,
    data: e.data.map(d => ({
      date: d.date,
      weight: d.weight,
      reps: d.reps,
      volume: d.volume,
    })),
  }));

  return (
    <div className="space-y-6">
      {/* Header with period filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pokrok</h1>
            <p className="text-muted-foreground text-sm">Sleduj své zlepšení</p>
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Personal Records */}
      <ClientPortalPRsCard />

      {/* Client Benchmarks - Comparison with others */}
      {clientId && <ClientExerciseBenchmarks clientId={clientId} />}

      {/* Pace Trend Chart - Elegant tempo progression */}
      <ClientPortalPaceTrendCard />

      {/* Info tip for new users */}
      {!isDataLoading && (showWeight || showBodyFat || showExercises) && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            💡 Grafy níže ukazují vývoj tvých měření v čase. Čím více dat, tím přesnější obraz.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {(showWeight || showBodyFat || showExercises) && (
        <ProgressSummaryCards
          weightData={weightData || []}
          bodyFatData={bodyFatData || []}
          trackedExercises={exercisesForSummary}
          isLoading={isDataLoading}
        />
      )}

      {/* Measurements History - Detailed view */}
      {showWeight && (
        <MeasurementsHistoryCard />
      )}

      {/* Weight & Body Fat Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {showWeight && (
          <WeightChart data={weightData || []} isLoading={weightLoading} />
        )}
        
        {showBodyFat && (
          <BodyFatChart data={bodyFatData || []} isLoading={bodyFatLoading} />
        )}
      </div>

      {/* All Exercises Chart */}
      {showExercises && (
        <AllExercisesChart 
          exercises={allExercises || []} 
          isLoading={exercisesLoading} 
        />
      )}

      {/* Cardio Section - Combined Charts */}
      {(showRowing500 || showRowing1000 || showRunning500 || showRunning1000) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Běh a veslo</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Veslo - Combined 500m + 1000m */}
            {(showRowing500 || showRowing1000) && (
              <CombinedCardioChart 
                data500={rowing500Data || []} 
                data1000={rowing1000Data || []}
                title="Veslo"
                icon={Bike}
                isLoading={rowing500Loading || rowing1000Loading}
              />
            )}
            
            {/* Běh - Combined 500m + 1000m */}
            {(showRunning500 || showRunning1000) && (
              <CombinedCardioChart 
                data500={running500Data || []} 
                data1000={running1000Data || []}
                title="Běh"
                icon={PersonStanding}
                isLoading={running500Loading || running1000Loading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
