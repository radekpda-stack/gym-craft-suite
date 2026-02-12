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
import { AsymmetryCard } from '@/components/client-portal/progress/AsymmetryCard';
import { PeriodFilter, type Period } from '@/components/client-portal/common/PeriodFilter';
import { RefreshButton } from '@/components/client-portal/common/RefreshButton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bike, PersonStanding, TrendingUp, Dumbbell, Scale, Activity } from 'lucide-react';

export default function ClientPortalProgress() {
  const { clientAccount, clientId } = useClientPortal();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_progress');
  const [period, setPeriod] = useState<Period>('all');

  const trainerId = clientAccount?.trainer_id || null;
  const months = period === 'all' ? 24 : Math.ceil(period / 30);

  const { data: visibilitySettings, isLoading: settingsLoading } = useClientPortalProgressSettings(trainerId);
  const { data: weightData, isLoading: weightLoading } = useClientWeightProgress(clientId);
  const { data: bodyFatData, isLoading: bodyFatLoading } = useClientBodyFatProgress(clientId);
  const { data: allExercises, isLoading: exercisesLoading } = useClientAllExercises(clientId, months);
  const { data: rowing500Data, isLoading: rowing500Loading } = useClientCardioProgress(clientId, 'veslo', 500, months);
  const { data: rowing1000Data, isLoading: rowing1000Loading } = useClientCardioProgress(clientId, 'veslo', 1000, months);
  const { data: running500Data, isLoading: running500Loading } = useClientCardioProgress(clientId, 'běh', 500, months);
  const { data: running1000Data, isLoading: running1000Loading } = useClientCardioProgress(clientId, 'běh', 1000, months);

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const metrics = visibilitySettings?.progressMetrics || {
    weight: true, bodyFat: true, trackedExercises: true,
    rowing500m: true, rowing1000m: true, running500m: true, running1000m: true,
  };

  const showWeight = metrics.weight;
  const showBodyFat = metrics.bodyFat;
  const showExercises = metrics.trackedExercises;
  const showRowing500 = metrics.rowing500m;
  const showRowing1000 = metrics.rowing1000m;
  const showRunning500 = metrics.running500m;
  const showRunning1000 = metrics.running1000m;

  const hasAnyVisible = showWeight || showBodyFat || showExercises || 
    showRowing500 || showRowing1000 || showRunning500 || showRunning1000;
  const hasCardio = showRowing500 || showRowing1000 || showRunning500 || showRunning1000;
  const hasBody = showWeight || showBodyFat;

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

  const exercisesForSummary = (allExercises || []).map(e => ({
    exerciseName: e.exerciseName,
    exerciseId: null,
    data: e.data.map(d => ({
      date: d.date, weight: d.weight, reps: d.reps, volume: d.volume,
    })),
  }));

  // Determine default tab
  const defaultTab = showExercises ? 'strength' : hasBody ? 'body' : 'cardio';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Pokrok</h1>
            <p className="text-muted-foreground text-sm">Sleduj své zlepšení</p>
          </div>
          <RefreshButton />
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          {showExercises && (
            <TabsTrigger value="strength" className="flex-1 gap-1.5">
              <Dumbbell className="w-4 h-4" />
              <span>Síla</span>
            </TabsTrigger>
          )}
          {hasBody && (
            <TabsTrigger value="body" className="flex-1 gap-1.5">
              <Scale className="w-4 h-4" />
              <span>Tělo</span>
            </TabsTrigger>
          )}
          {hasCardio && (
            <TabsTrigger value="cardio" className="flex-1 gap-1.5">
              <Activity className="w-4 h-4" />
              <span>Kardio</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Strength Tab */}
        {showExercises && (
          <TabsContent value="strength" className="space-y-4">
            <ClientPortalPRsCard />
            {clientId && <AsymmetryCard clientId={clientId} />}
            {clientId && <ClientExerciseBenchmarks clientId={clientId} />}
            
            <ProgressSummaryCards
              weightData={[]}
              bodyFatData={[]}
              trackedExercises={exercisesForSummary}
              isLoading={isDataLoading}
            />

            <AllExercisesChart 
              exercises={allExercises || []} 
              isLoading={exercisesLoading} 
            />
          </TabsContent>
        )}

        {/* Body Tab */}
        {hasBody && (
          <TabsContent value="body" className="space-y-4">
            <ProgressSummaryCards
              weightData={weightData || []}
              bodyFatData={bodyFatData || []}
              trackedExercises={[]}
              isLoading={isDataLoading}
            />

            {showWeight && <MeasurementsHistoryCard />}

            <div className="grid gap-4 md:grid-cols-2">
              {showWeight && (
                <WeightChart data={weightData || []} isLoading={weightLoading} />
              )}
              {showBodyFat && (
                <BodyFatChart data={bodyFatData || []} isLoading={bodyFatLoading} />
              )}
            </div>
          </TabsContent>
        )}

        {/* Cardio Tab */}
        {hasCardio && (
          <TabsContent value="cardio" className="space-y-4">
            <ClientPortalPaceTrendCard />
            
            <div className="grid gap-4 md:grid-cols-2">
              {(showRowing500 || showRowing1000) && (
                <CombinedCardioChart 
                  data500={rowing500Data || []} 
                  data1000={rowing1000Data || []}
                  title="Veslo"
                  icon={Bike}
                  isLoading={rowing500Loading || rowing1000Loading}
                />
              )}
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
