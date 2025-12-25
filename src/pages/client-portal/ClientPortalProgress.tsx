import { useEffect } from 'react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  useClientWeightProgress, 
  useClientBodyFatProgress, 
  useClientCardioProgress,
  useClientTrackedExercises,
  useClientPortalProgressSettings 
} from '@/hooks/useClientProgressData';
import { 
  WeightChart, 
  BodyFatChart, 
  CardioProgressChart, 
  TrackedExercisesChart 
} from '@/components/client-portal/progress';
import { Bike, PersonStanding } from 'lucide-react';

export default function ClientPortalProgress() {
  const { clientAccount, clientId } = useClientPortal();
  const { trackPageMount } = useClientPortalPageTracking('client_portal_progress');

  const trainerId = clientAccount?.trainer_id || null;

  // Fetch visibility settings
  const { data: visibilitySettings, isLoading: settingsLoading } = useClientPortalProgressSettings(trainerId);

  // Fetch progress data
  const { data: weightData, isLoading: weightLoading } = useClientWeightProgress(clientId);
  const { data: bodyFatData, isLoading: bodyFatLoading } = useClientBodyFatProgress(clientId);
  const { data: trackedExercises, isLoading: exercisesLoading } = useClientTrackedExercises(clientId);
  
  // Cardio data
  const { data: rowing500Data, isLoading: rowing500Loading } = useClientCardioProgress(clientId, 'veslo', 500);
  const { data: rowing1000Data, isLoading: rowing1000Loading } = useClientCardioProgress(clientId, 'veslo', 1000);
  const { data: running500Data, isLoading: running500Loading } = useClientCardioProgress(clientId, 'běh', 500);
  const { data: running1000Data, isLoading: running1000Loading } = useClientCardioProgress(clientId, 'běh', 1000);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pokrok</h1>
        <p className="text-muted-foreground">Sleduj své zlepšení</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showWeight && (
          <WeightChart data={weightData || []} isLoading={weightLoading} />
        )}
        
        {showBodyFat && (
          <BodyFatChart data={bodyFatData || []} isLoading={bodyFatLoading} />
        )}
      </div>

      {showExercises && (
        <TrackedExercisesChart 
          exercises={trackedExercises || []} 
          isLoading={exercisesLoading} 
        />
      )}

      {(showRowing500 || showRowing1000 || showRunning500 || showRunning1000) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Kardio</h2>
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
