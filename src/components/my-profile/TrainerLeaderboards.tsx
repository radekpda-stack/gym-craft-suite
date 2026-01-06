import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Dumbbell, Timer, Medal, TrendingUp, User, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyProfile } from '@/hooks/useMyProfile';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { EditExerciseEntryDialog } from '@/components/exercises/EditExerciseEntryDialog';

interface ExerciseLeaderboardEntry {
  rank: number;
  clientId: string;
  name: string;
  value: number;
  displayValue: string;
  date: string;
  isTrainer: boolean;
  entryId: string;
}

interface ExerciseOption {
  name: string;
  type: 'strength' | 'cardio';
  count: number;
}

export function TrainerLeaderboards() {
  const { data: profile } = useMyProfile();
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editMetricCategory, setEditMetricCategory] = useState<string | null>(null);

  // Get available exercises (both trainer's and clients')
  const { data: exerciseOptions, isLoading: exercisesLoading } = useQuery({
    queryKey: ['trainer-exercises-for-leaderboard'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all clients including trainer's self profile
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (!clients?.length) return [];
      const clientIds = clients.map(c => c.id);

      // Get strength exercises with PR data
      const { data: strengthPRs } = await supabase
        .from('exercise_entries')
        .select('exercise_name')
        .in('client_id', clientIds)
        .eq('is_pr', true)
        .not('weight_kg', 'is', null);

      // Get cardio exercises with PR data
      const { data: cardioPRs } = await supabase
        .from('exercise_entries')
        .select('exercise_name')
        .in('client_id', clientIds)
        .eq('is_pr', true)
        .or('distance_meters.not.is.null,time_seconds.not.is.null');

      // Count occurrences
      const strengthCounts = new Map<string, number>();
      const cardioCounts = new Map<string, number>();

      strengthPRs?.forEach(e => {
        strengthCounts.set(e.exercise_name, (strengthCounts.get(e.exercise_name) || 0) + 1);
      });

      cardioPRs?.forEach(e => {
        // Only add to cardio if not already in strength with higher count
        if (!strengthCounts.has(e.exercise_name)) {
          cardioCounts.set(e.exercise_name, (cardioCounts.get(e.exercise_name) || 0) + 1);
        }
      });

      const options: ExerciseOption[] = [
        ...Array.from(strengthCounts.entries()).map(([name, count]) => ({
          name,
          type: 'strength' as const,
          count,
        })),
        ...Array.from(cardioCounts.entries()).map(([name, count]) => ({
          name,
          type: 'cardio' as const,
          count,
        })),
      ].sort((a, b) => b.count - a.count);

      return options;
    },
  });

  // Get leaderboard for selected exercise
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['exercise-leaderboard', selectedExercise],
    queryFn: async () => {
      if (!selectedExercise) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get all clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, is_self_profile')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (!clients?.length) return null;
      const clientIds = clients.map(c => c.id);
      const clientMap = new Map(clients.map(c => [c.id, { name: c.name, isTrainer: c.is_self_profile }]));

      // Get best entry for each client for this exercise
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('id, client_id, exercise_name, weight_kg, reps, distance_meters, time_seconds, avg_watts, date, is_pr')
        .in('client_id', clientIds)
        .eq('exercise_name', selectedExercise)
        .eq('is_pr', true)
        .order('weight_kg', { ascending: false, nullsFirst: false });

      if (!entries?.length) return { entries: [], exerciseType: 'strength' as const };

      // Determine exercise type
      const hasWeight = entries.some(e => e.weight_kg && e.weight_kg > 0);
      const hasCardio = entries.some(e => (e.distance_meters && e.distance_meters > 0) || (e.time_seconds && e.time_seconds > 0));
      const exerciseType = hasWeight ? 'strength' : 'cardio';

      // Get best per client
      const bestByClient = new Map<string, typeof entries[0]>();
      
      for (const entry of entries) {
        const existing = bestByClient.get(entry.client_id);
        if (!existing) {
          bestByClient.set(entry.client_id, entry);
        } else {
          // Compare and keep better one
          if (exerciseType === 'strength') {
            if ((entry.weight_kg || 0) > (existing.weight_kg || 0)) {
              bestByClient.set(entry.client_id, entry);
            }
          } else {
            // For cardio, lower time is better, or higher distance
            if (entry.time_seconds && existing.time_seconds) {
              if (entry.time_seconds < existing.time_seconds) {
                bestByClient.set(entry.client_id, entry);
              }
            }
          }
        }
      }

      // Format entries
      const formatted: ExerciseLeaderboardEntry[] = Array.from(bestByClient.entries())
        .map(([clientId, entry]) => {
          const clientInfo = clientMap.get(clientId);
          let value: number;
          let displayValue: string;

          if (exerciseType === 'strength') {
            value = entry.weight_kg || 0;
            displayValue = `${value}kg${entry.reps ? ` × ${entry.reps}` : ''}`;
          } else {
            // Cardio - use time as value (lower is better)
            value = entry.time_seconds || 0;
            if (entry.time_seconds) {
              const mins = Math.floor(entry.time_seconds / 60);
              const secs = Math.round(entry.time_seconds % 60);
              displayValue = `${mins}:${String(secs).padStart(2, '0')}`;
              if (entry.distance_meters) {
                displayValue = `${entry.distance_meters}m • ${displayValue}`;
              }
              if (entry.avg_watts) {
                displayValue += ` • ${Math.round(entry.avg_watts)}W`;
              }
            } else if (entry.distance_meters) {
              value = entry.distance_meters;
              displayValue = `${entry.distance_meters}m`;
            } else {
              displayValue = '-';
            }
          }

          return {
            rank: 0,
            clientId,
            entryId: entry.id,
            name: clientInfo?.name || 'Neznámý',
            value,
            displayValue,
            date: entry.date,
            isTrainer: clientInfo?.isTrainer || false,
          };
        })
        .sort((a, b) => {
          if (exerciseType === 'strength') {
            return b.value - a.value; // Higher is better
          } else {
            return a.value - b.value; // Lower time is better
          }
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      return { entries: formatted, exerciseType };
    },
    enabled: !!selectedExercise,
  });

  // Get trainer's progress for selected exercise
  const { data: trainerProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['trainer-exercise-progress', selectedExercise, profile?.clientId],
    queryFn: async () => {
      if (!selectedExercise || !profile?.clientId) return null;

      const { data: entries } = await supabase
        .from('exercise_entries')
        .select('date, weight_kg, reps, distance_meters, time_seconds, avg_watts, is_pr')
        .eq('client_id', profile.clientId)
        .eq('exercise_name', selectedExercise)
        .order('date', { ascending: true })
        .limit(20);

      return entries || [];
    },
    enabled: !!selectedExercise && !!profile?.clientId,
  });

  const isLoading = exercisesLoading || leaderboardLoading;

  // Set default exercise when options load
  if (exerciseOptions?.length && !selectedExercise) {
    setSelectedExercise(exerciseOptions[0].name);
  }

  return (
    <div className="space-y-4">
      {/* Header with exercise selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Srovnání výkonů
        </h2>
        
        {exerciseOptions && exerciseOptions.length > 0 && (
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Vyberte cvik" />
            </SelectTrigger>
            <SelectContent>
              {exerciseOptions.map((option) => (
                <SelectItem key={option.name} value={option.name}>
                  <div className="flex items-center gap-2">
                    {option.type === 'strength' ? (
                      <Dumbbell className="w-3 h-3 text-orange-500" />
                    ) : (
                      <Timer className="w-3 h-3 text-blue-500" />
                    )}
                    <span>{option.name}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {option.count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px]" />
      ) : !selectedExercise || !leaderboardData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Vyberte cvik pro zobrazení žebříčku
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="w-4 h-4 text-yellow-500" />
                Žebříček - {selectedExercise}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardData.entries.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Žádná data pro tento cvik</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.entries.map((entry) => (
                    <div
                      key={entry.clientId}
                      onClick={() => {
                        setEditEntryId(entry.entryId);
                        setEditMetricCategory(leaderboardData.exerciseType);
                      }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group',
                        entry.isTrainer 
                          ? 'bg-primary/10 border border-primary/30 hover:bg-primary/20' 
                          : 'bg-secondary/30 hover:bg-secondary/50',
                        entry.rank <= 3 && 'font-semibold'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                          entry.rank === 1 && 'bg-yellow-500/20 text-yellow-600',
                          entry.rank === 2 && 'bg-slate-400/20 text-slate-600',
                          entry.rank === 3 && 'bg-orange-500/20 text-orange-600',
                          entry.rank > 3 && 'bg-muted text-muted-foreground'
                        )}>
                          {entry.rank <= 3 ? <Medal className="w-4 h-4" /> : entry.rank}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{entry.name}</span>
                          {entry.isTrainer && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <User className="w-3 h-3 mr-1" />
                              Já
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="secondary" className="font-mono">
                            {entry.displayValue}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(entry.date), 'd.M.yyyy', { locale: cs })}
                          </p>
                        </div>
                        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trainer progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Můj pokrok - {selectedExercise}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progressLoading ? (
                <Skeleton className="h-[200px]" />
              ) : !trainerProgress?.length ? (
                <div className="py-8 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Zatím žádné záznamy</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {trainerProgress.slice().reverse().map((entry, index) => {
                    const isStrength = entry.weight_kg && entry.weight_kg > 0;
                    let displayValue: string;
                    
                    if (isStrength) {
                      displayValue = `${entry.weight_kg}kg${entry.reps ? ` × ${entry.reps}` : ''}`;
                    } else if (entry.time_seconds) {
                      const mins = Math.floor(entry.time_seconds / 60);
                      const secs = Math.round(entry.time_seconds % 60);
                      displayValue = `${mins}:${String(secs).padStart(2, '0')}`;
                      if (entry.distance_meters) {
                        displayValue = `${entry.distance_meters}m • ${displayValue}`;
                      }
                      if (entry.avg_watts) {
                        displayValue += ` • ${Math.round(entry.avg_watts)}W`;
                      }
                    } else if (entry.distance_meters) {
                      displayValue = `${entry.distance_meters}m`;
                    } else {
                      displayValue = '-';
                    }

                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-lg',
                          entry.is_pr ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), 'd.M.yyyy', { locale: cs })}
                          </span>
                          {entry.is_pr && (
                            <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-600">
                              PR
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium text-sm">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <EditExerciseEntryDialog
        entryId={editEntryId}
        metricCategory={editMetricCategory}
        open={!!editEntryId}
        onOpenChange={(open) => {
          if (!open) {
            setEditEntryId(null);
            setEditMetricCategory(null);
          }
        }}
      />
    </div>
  );
}
