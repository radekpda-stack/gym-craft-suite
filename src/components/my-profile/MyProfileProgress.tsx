import { useState } from 'react';
import { 
  useClientWeightProgress, 
  useClientBodyFatProgress,
  useClientTrackedExercises,
  useClientPortalProgressSettings 
} from '@/hooks/useClientProgressData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WeightChart } from '@/components/client-portal/progress/WeightChart';
import { BodyFatChart } from '@/components/client-portal/progress/BodyFatChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell } from 'lucide-react';

interface MyProfileProgressProps {
  clientId: string;
  trainerId: string;
}

export function MyProfileProgress({ clientId, trainerId }: MyProfileProgressProps) {
  const [period, setPeriod] = useState<number>(6);
  
  const { data: settings, isLoading: settingsLoading } = useClientPortalProgressSettings(trainerId);
  const { data: weightData, isLoading: weightLoading } = useClientWeightProgress(clientId, period);
  const { data: bodyFatData, isLoading: bodyFatLoading } = useClientBodyFatProgress(clientId, period);
  const { data: exerciseData, isLoading: exerciseLoading } = useClientTrackedExercises(clientId);

  const isLoading = settingsLoading || weightLoading || bodyFatLoading || exerciseLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  const showWeight = settings?.progressMetrics?.weight !== false;
  const showBodyFat = settings?.progressMetrics?.bodyFat !== false;
  const showExercises = settings?.progressMetrics?.trackedExercises !== false;

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-end">
        <Select value={period.toString()} onValueChange={(v) => setPeriod(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Období" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 měsíce</SelectItem>
            <SelectItem value="6">6 měsíců</SelectItem>
            <SelectItem value="12">12 měsíců</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {showWeight && weightData && weightData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Váha</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightChart data={weightData} />
            </CardContent>
          </Card>
        )}

        {showBodyFat && bodyFatData && bodyFatData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tělesný tuk</CardTitle>
            </CardHeader>
            <CardContent>
              <BodyFatChart data={bodyFatData} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Exercise Progress */}
      {showExercises && exerciseData && exerciseData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              Pokrok ve cvicích
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exerciseData.map((ex) => (
                <div key={ex.exerciseName} className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{ex.exerciseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {ex.data.length > 0 
                      ? `Poslední: ${ex.data[ex.data.length - 1].weight} kg` 
                      : 'Žádná data'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
