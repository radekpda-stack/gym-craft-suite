/**
 * Sheet displaying exercise entry detail with metrics, edit option, and client performance chart
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Timer, 
  Zap, 
  Gauge, 
  Activity, 
  Trophy, 
  Edit2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  User,
  Heart,
  Footprints,
  Weight,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatTimeMs } from '@/lib/timeUtils';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { EditEntryDialog } from '@/components/progress/EditEntryDialog';
import { ExerciseEntry } from '@/hooks/useExerciseEntries';

interface ExerciseEntryDetailSheetProps {
  entryId: string | null;
  exerciseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(seconds: number, ms?: number | null): string {
  if (ms !== null && ms !== undefined) {
    return formatTimeMs(ms);
  }
  return formatTimeMs(seconds * 1000);
}

function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExerciseEntryDetailSheet({ 
  entryId, 
  exerciseId, 
  open, 
  onOpenChange 
}: ExerciseEntryDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false);

  // Fetch entry details
  const { data: entry, isLoading: entryLoading } = useQuery({
    queryKey: ['exercise-entry-detail', entryId],
    queryFn: async () => {
      if (!entryId) return null;

      const { data, error } = await supabase
        .from('exercise_entries')
        .select(`
          *,
          clients(id, name),
          exercises(id, name, name_cs, category, is_time_based)
        `)
        .eq('id', entryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!entryId,
  });

  // Fetch client's history for this exercise
  const { data: clientHistory } = useQuery({
    queryKey: ['exercise-client-history', exerciseId, entry?.client_id],
    queryFn: async () => {
      if (!entry?.client_id) return null;

      const { data, error } = await supabase
        .from('exercise_entries')
        .select('id, date, time_seconds, time_ms, weight_kg, reps, avg_watts, is_pr')
        .eq('exercise_id', exerciseId)
        .eq('client_id', entry.client_id)
        .order('date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open && !!entry?.client_id,
  });

  const isTimeBased = entry?.exercises?.is_time_based || 
    entry?.exercises?.category === 'cardio' || 
    entry?.exercises?.category === 'conditioning';

  const clientName = (entry?.clients as any)?.name || 'Neznámý klient';
  const exerciseName = entry?.exercises?.name_cs || entry?.exercises?.name || entry?.exercise_name || '';

  // Calculate stats
  const stats = clientHistory ? (() => {
    const entries = clientHistory;
    if (entries.length < 2) return null;

    if (isTimeBased) {
      const times = entries.filter(e => e.time_seconds).map(e => e.time_ms || (e.time_seconds! * 1000));
      if (times.length < 2) return null;
      
      const best = Math.min(...times);
      const worst = Math.max(...times);
      const current = entry?.time_ms || (entry?.time_seconds ? entry.time_seconds * 1000 : null);
      const improvement = current && times.length > 1 
        ? ((times[0] - current) / times[0] * 100)
        : null;
      
      return { best, worst, improvement, count: entries.length };
    } else {
      const weights = entries.filter(e => e.weight_kg).map(e => e.weight_kg!);
      if (weights.length < 2) return null;
      
      const best = Math.max(...weights);
      const first = weights[0];
      const current = entry?.weight_kg;
      const improvement = current && first 
        ? ((current - first) / first * 100)
        : null;
      
      return { best, improvement, count: entries.length };
    }
  })() : null;

  // Prepare chart data
  const chartData = clientHistory?.map(e => ({
    date: format(new Date(e.date), 'd.M', { locale: cs }),
    value: isTimeBased 
      ? (e.time_ms ? e.time_ms / 1000 : e.time_seconds || 0)
      : (e.weight_kg || 0),
    isPR: e.is_pr,
    isCurrent: e.id === entryId,
  })) || [];

  if (entryLoading || !entry) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-lg">{exerciseName}</SheetTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{clientName}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                Upravit
              </Button>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            {/* Date & PR Badge */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(entry.date), 'd. MMMM yyyy', { locale: cs })}
              </span>
              {entry.is_pr && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Trophy className="w-3 h-3 mr-1" />
                  PR
                </Badge>
              )}
            </div>

            <Separator />

            {/* Main Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {isTimeBased ? (
                <>
                  {/* Time */}
                  {entry.time_seconds && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Timer className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs">Čas</span>
                      </div>
                      <span className="text-xl font-bold">
                        {formatTime(entry.time_seconds, entry.time_ms)}
                      </span>
                    </Card>
                  )}

                  {/* Watts */}
                  {entry.avg_watts && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Zap className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs">Výkon</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">{entry.avg_watts}</span>
                        <span className="text-xs text-muted-foreground ml-1">W</span>
                      </div>
                      {entry.max_watts && (
                        <span className="text-xs text-muted-foreground">Max: {entry.max_watts} W</span>
                      )}
                    </Card>
                  )}

                  {/* Pace */}
                  {entry.pace_sec_per_500m && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Gauge className="w-3.5 h-3.5 text-success" />
                        <span className="text-xs">Tempo /500m</span>
                      </div>
                      <span className="text-xl font-bold">
                        {formatPace(entry.pace_sec_per_500m)}
                      </span>
                    </Card>
                  )}

                  {/* Distance */}
                  {entry.distance_meters && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-xs">Vzdálenost</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">{entry.distance_meters}</span>
                        <span className="text-xs text-muted-foreground ml-1">m</span>
                      </div>
                    </Card>
                  )}

                  {/* Heart Rate */}
                  {entry.avg_heart_rate && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Heart className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs">Tep</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">{entry.avg_heart_rate}</span>
                        <span className="text-xs text-muted-foreground ml-1">bpm</span>
                      </div>
                      {entry.max_heart_rate && (
                        <span className="text-xs text-muted-foreground">Max: {entry.max_heart_rate}</span>
                      )}
                    </Card>
                  )}

                  {/* Cadence */}
                  {entry.cadence_spm && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Footprints className="w-3.5 h-3.5" />
                        <span className="text-xs">Kadence</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">{entry.cadence_spm}</span>
                        <span className="text-xs text-muted-foreground ml-1">spm</span>
                      </div>
                    </Card>
                  )}

                  {/* Strokes */}
                  {entry.strokes && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs">Záběry</span>
                      </div>
                      <span className="text-xl font-bold">{entry.strokes}</span>
                    </Card>
                  )}

                  {/* Level/Resistance */}
                  {(entry.level || entry.resistance) && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs">Level/Odpor</span>
                      </div>
                      <span className="text-xl font-bold">
                        {entry.level ? `L${entry.level}` : ''}
                        {entry.level && entry.resistance ? ' / ' : ''}
                        {entry.resistance ? `M${entry.resistance}` : ''}
                      </span>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  {/* Weight */}
                  {entry.weight_kg && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Weight className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs">Váha</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">{entry.weight_kg}</span>
                        <span className="text-xs text-muted-foreground ml-1">kg</span>
                      </div>
                    </Card>
                  )}

                  {/* Sets x Reps */}
                  {entry.sets && entry.reps && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs">Série × Opak.</span>
                      </div>
                      <span className="text-xl font-bold">{entry.sets} × {entry.reps}</span>
                    </Card>
                  )}

                  {/* Volume */}
                  {entry.weight_kg && entry.sets && entry.reps && (
                    <Card className="p-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-xs">Objem</span>
                      </div>
                      <div>
                        <span className="text-xl font-bold">
                          {entry.weight_kg * entry.sets * entry.reps}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">kg</span>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* RPE - universal */}
              {entry.rpe && (
                <Card className="p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-xs">RPE</span>
                  </div>
                  <span className={cn(
                    "text-xl font-bold",
                    entry.rpe >= 9 && "text-destructive",
                    entry.rpe >= 7 && entry.rpe < 9 && "text-warning",
                    entry.rpe < 7 && "text-success"
                  )}>
                    {entry.rpe}/10
                  </span>
                </Card>
              )}

              {/* Calories */}
              {entry.calories_kcal && (
                <Card className="p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-xs">Kalorie</span>
                  </div>
                  <div>
                    <span className="text-xl font-bold">{entry.calories_kcal}</span>
                    <span className="text-xs text-muted-foreground ml-1">kcal</span>
                  </div>
                </Card>
              )}
            </div>

            {/* Notes */}
            {entry.notes && (
              <Card className="p-3">
                <p className="text-sm text-muted-foreground mb-1">Poznámka</p>
                <p className="text-sm">{entry.notes}</p>
              </Card>
            )}

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {entry.is_test && (
                <Badge variant="secondary">Test</Badge>
              )}
              {entry.leg_fatigue && (
                <Badge variant="secondary">Únava nohou</Badge>
              )}
              {entry.training_type && (
                <Badge variant="outline">{entry.training_type}</Badge>
              )}
            </div>

            <Separator />

            {/* Client Performance Stats */}
            {stats && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Statistiky klienta
                </h4>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Card className="p-2">
                    <p className="text-xs text-muted-foreground">Záznamů</p>
                    <p className="font-bold">{stats.count}</p>
                  </Card>
                  <Card className="p-2">
                    <p className="text-xs text-muted-foreground">
                      {isTimeBased ? 'Nejlepší' : 'Max'}
                    </p>
                    <p className="font-bold">
                      {isTimeBased 
                        ? formatTimeMs(stats.best as number)
                        : `${stats.best} kg`
                      }
                    </p>
                  </Card>
                  {stats.improvement !== null && (
                    <Card className="p-2">
                      <p className="text-xs text-muted-foreground">Zlepšení</p>
                      <p className={cn(
                        "font-bold flex items-center justify-center gap-1",
                        stats.improvement > 0 ? "text-success" : stats.improvement < 0 ? "text-destructive" : ""
                      )}>
                        {stats.improvement > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : stats.improvement < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {Math.abs(stats.improvement).toFixed(1)}%
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Vývoj výkonu
                </h4>
                
                <Card className="p-3">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          axisLine={false} 
                          tickLine={false}
                          reversed={isTimeBased}
                          tickFormatter={(v) => isTimeBased ? formatPace(v) : `${v}`}
                          domain={isTimeBased ? ['dataMin - 5', 'dataMax + 5'] : ['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [
                            isTimeBased ? formatPace(value) : `${value} kg`,
                            isTimeBased ? 'Čas' : 'Váha'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.isCurrent) {
                              return (
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={8} 
                                  fill="hsl(var(--primary))" 
                                  stroke="hsl(var(--background))" 
                                  strokeWidth={3}
                                />
                              );
                            }
                            if (payload.isPR) {
                              return (
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={5} 
                                  fill="hsl(var(--warning))" 
                                  stroke="hsl(var(--background))" 
                                  strokeWidth={2}
                                />
                              );
                            }
                            return null;
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {isTimeBased ? 'Nižší = lepší' : 'Vyšší = lepší'} • Aktuální záznam je zvýrazněn
                  </p>
                </Card>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <EditEntryDialog
        entry={entry as ExerciseEntry}
        metricCategory={isTimeBased ? 'rower' : 'strength'}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
