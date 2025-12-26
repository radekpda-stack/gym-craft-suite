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
  CardioProgressChart, 
  AllExercisesChart 
} from '@/components/client-portal/progress';
import { ProgressSummaryCards } from '@/components/client-portal/progress/ProgressSummaryCards';
import { AddMeasurementDialog } from '@/components/client-portal/progress/AddMeasurementDialog';
import { AddCardioTimeDialog } from '@/components/client-portal/progress/AddCardioTimeDialog';
import { PeriodFilter, type Period } from '@/components/client-portal/common/PeriodFilter';
import { Bike, PersonStanding } from 'lucide-react';

export default function ClientPortalProgress() {
  const { clientAccount, clientId } = useClientPortal();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_progress');
  const [period, setPeriod] = useState<Period>(90);

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
        <div>
          <h1 className="text-2xl font-bold">Pokrok</h1>
          <p className="text-muted-foreground">Sleduj své zlepšení</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Summary cards */}
      {(showWeight || showBodyFat || showExercises) && (
        <ProgressSummaryCards
          weightData={weightData || []}
          bodyFatData={bodyFatData || []}
          trackedExercises={exercisesForSummary}
          isLoading={isDataLoading}
        />
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

      {/* Cardio Section */}
      {(showRowing500 || showRowing1000 || showRunning500 || showRunning1000) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kardio</h2>
            <AddCardioTimeDialog />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {showRowing500 && (
              <CardioProgressChart 
                data={rowing500Data || []} 
                title="Veslo 500m"
                icon={Bike}
                isLoading={rowing500Loading}
              />
            )}
            
            {showRowing1000 && (
              <CardioProgressChart 
                data={rowing1000Data || []} 
                title="Veslo 1000m"
                icon={Bike}
                isLoading={rowing1000Loading}
              />
            )}
            
            {showRunning500 && (
              <CardioProgressChart 
                data={running500Data || []} 
                title="Běh 500m"
                icon={PersonStanding}
                isLoading={running500Loading}
              />
            )}
            
            {showRunning1000 && (
              <CardioProgressChart 
                data={running1000Data || []} 
                title="Běh 1000m"
                icon={PersonStanding}
                isLoading={running1000Loading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
