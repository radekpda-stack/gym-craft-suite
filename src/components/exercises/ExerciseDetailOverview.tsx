import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Activity, Timer, Target, Gauge, Info, PlusCircle, FileText, Zap, Pencil, Ruler } from 'lucide-react';
import { formatPace500m } from '@/lib/exerciseMetrics';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { ExerciseRelationsManager } from '@/components/exercises/ExerciseRelationsManager';
import { EditExerciseEntryDialog } from '@/components/exercises/EditExerciseEntryDialog';
import type { ExerciseStats } from '@/hooks/useExerciseStats';
interface ExerciseDetailOverviewProps {
  exercise: {
    id: string;
    name: string;
    name_cs?: string;
    category?: string;
    movement_pattern?: string;
    difficulty?: string;
    equipment?: string[];
    muscle_groups?: string[];
    description_cs?: string;
    description?: string;
    instructions_cs?: string;
    is_unilateral?: boolean;
    is_bodyweight?: boolean;
    is_time_based?: boolean;
  };
  stats: ExerciseStats | undefined;
  exerciseType: 'strength' | 'cardio' | 'mixed';
  selectedClientId: string | null;
  onQuickLog: () => void;
}

const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  squat: 'Dřep',
  hinge: 'Hip hinge',
  lunge: 'Výpad',
  push_horizontal: 'Tlak horizontální',
  push_vertical: 'Tlak vertikální',
  pull_horizontal: 'Tah horizontální',
  pull_vertical: 'Tah vertikální',
  carry: 'Přenášení',
  core_anti_extension: 'Core anti-extenze',
  core_anti_rotation: 'Core anti-rotace',
  core_anti_lateral_flexion: 'Core anti-laterální flexe',
  rotation: 'Rotace',
  locomotion: 'Lokomoce',
  conditioning: 'Kondice',
  mobility: 'Mobilita',
  other: 'Ostatní',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Začátečník',
  intermediate: 'Pokročilý',
  advanced: 'Expert',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Vlastní váha',
  barbell: 'Činka',
  dumbbell: 'Jednoručky',
  kettlebell: 'Kettlebell',
  cable: 'Kladka',
  machine: 'Stroj',
  bands: 'Gumy',
  bench: 'Lavice',
  pullup_bar: 'Hrazda',
  rings: 'Kruhy',
  trx: 'TRX',
  box: 'Bedna',
  medicine_ball: 'Medicinbal',
  slam_ball: 'Slam ball',
  rower: 'Veslovací trenažér',
  ski_erg: 'Ski erg',
  treadmill: 'Běžecký pás',
  treadmill_sled_mode: 'Běžecký pás (sled)',
  sled: 'Sáně',
  landmine: 'Landmine',
  hex_bar: 'Hex bar',
  plyo_platform: 'Plyometrická platforma',
  other: 'Jiné',
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExerciseDetailOverview({ 
  exercise, 
  stats, 
  exerciseType, 
  selectedClientId,
  onQuickLog 
}: ExerciseDetailOverviewProps) {
  const navigate = useNavigate();
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  
  // Determine if this is time-based or jump exercise from stats or exercise type
  const isTimeBased = stats?.isTimeBased || exercise.is_time_based || exerciseType === 'cardio';
  const isJumpExercise = stats?.isJumpExercise || false;
  
  const hasData = stats && (stats.totalEntries > 0 || (stats.prHistory && stats.prHistory.length > 0));

  // Get last 5 records from PR history
  const recentRecords = stats?.prHistory?.slice(0, 5) || [];

  // Get top PR for selected client or global
  const topPR = selectedClientId 
    ? stats?.prHistory?.find(pr => pr.clientId === selectedClientId)
    : stats?.prHistory?.[0];
  
  const metricCategory = isTimeBased ? 'cardio' : 'strength';

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      {hasData ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {isJumpExercise ? (
            // Jump exercise cards
            <>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs truncate">Nejlepší skok</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {stats?.bestDistance ? `${Math.round(stats.bestDistance * 100)}` : '–'}
                  </span>
                  <span className="text-xs text-muted-foreground">cm</span>
                </div>
                {stats?.bestDistanceClient && !selectedClientId && (
                  <span className="text-[11px] text-muted-foreground truncate block">{stats.bestDistanceClient}</span>
                )}
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">Průměr</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {stats?.averageDistance ? `${Math.round(stats.averageDistance * 100)}` : '–'}
                  </span>
                  <span className="text-xs text-muted-foreground">cm</span>
                </div>
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">Pokusů</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums">{stats?.totalEntries || 0}</span>
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs truncate">PRs</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums">{stats?.prHistory?.length || 0}</span>
              </Card>
            </>
          ) : !isTimeBased ? (
            // Strength exercise cards
            <>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs truncate">Max váha</span>
                  <StatInfoTooltip
                    title="Maximální váha"
                    description="Nejvyšší zaznamenaná váha"
                    calculation="Maximum z weight_kg"
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {stats?.globalMaxWeight ? `${stats.globalMaxWeight}` : '–'}
                  </span>
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
                {stats?.globalMaxWeightClient && !selectedClientId && (
                  <span className="text-[11px] text-muted-foreground truncate block">{stats.globalMaxWeightClient}</span>
                )}
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Activity className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">Celk. objem</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {stats?.totalEntries ? `${Math.round((stats.averageWeight || 0) * (stats.averageReps || 0) * stats.totalEntries / 1000)}` : '–'}
                  </span>
                  <span className="text-xs text-muted-foreground">t</span>
                </div>
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">Průměr</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-bold tabular-nums">
                    {stats?.averageWeight ? `${stats.averageWeight}` : '–'}
                  </span>
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
                {stats?.averageReps && (
                  <span className="text-[11px] text-muted-foreground">~{stats.averageReps} opak.</span>
                )}
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs truncate">PR klienti</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums">{stats?.prHistory?.length || 0}</span>
              </Card>
            </>
          ) : (
            // Time-based / Cardio exercise cards
            <>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Timer className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs truncate">Nejlepší</span>
                  <StatInfoTooltip
                    title="Nejlepší čas"
                    description="Nejkratší zaznamenaný čas"
                    calculation="Minimum z time_seconds"
                  />
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums">
                  {stats?.bestTime ? formatTime(stats.bestTime) : '–'}
                </span>
                {stats?.bestTimeClient && !selectedClientId && (
                  <span className="text-[11px] text-muted-foreground truncate block">{stats.bestTimeClient}</span>
                )}
              </Card>
              <Card className="p-2 sm:p-3">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs truncate">Průměr</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tabular-nums">
                  {stats?.averageTime ? formatTime(stats.averageTime) : '–'}
                </span>
              </Card>
              {stats?.bestWatts ? (
                <Card className="p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Zap className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span className="text-xs truncate">Max W</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold tabular-nums">{stats.bestWatts}</span>
                    <span className="text-xs text-muted-foreground">W</span>
                  </div>
                  {stats.averageWatts && (
                    <span className="text-[11px] text-muted-foreground">Ø {stats.averageWatts} W</span>
                  )}
                </Card>
              ) : stats?.bestPace500m ? (
                <Card className="p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Gauge className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-xs truncate">Tempo</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold tabular-nums">{formatPace500m(stats.bestPace500m)}</span>
                  {stats.averagePace500m && (
                    <span className="text-[11px] text-muted-foreground">Ø {formatPace500m(stats.averagePace500m)}</span>
                  )}
                </Card>
              ) : (
                <Card className="p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">Záznamy</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold tabular-nums">{stats?.totalTimeEntries || stats?.totalEntries || 0}</span>
                </Card>
              )}
              {stats?.averageCadence ? (
                <Card className="p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate">Kadence</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold tabular-nums">{stats.averageCadence}</span>
                    <span className="text-xs text-muted-foreground">spm</span>
                  </div>
                </Card>
              ) : (
                <Card className="p-2 sm:p-3">
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <Trophy className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs truncate">PRs</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold tabular-nums">{stats?.prHistory?.length || 0}</span>
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        /* Empty state */
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Zatím bez záznamů</h3>
              <p className="text-sm text-muted-foreground">
                Přidejte první záznam výkonu pro tento cvik
              </p>
            </div>
            <Button onClick={onQuickLog} className="mt-2">
              <PlusCircle className="w-4 h-4 mr-2" />
              Přidat záznam
            </Button>
          </div>
        </Card>
      )}

      {/* PR Highlight */}
      {topPR && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Osobní rekord</span>
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(topPR.date), 'd. MMMM yyyy', { locale: cs })}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{topPR.clientName}</p>
              </div>
              <div className="text-right">
                {/* For time-based exercises (cardio), prefer timeSeconds over distanceMeters */}
                {isTimeBased && topPR.timeSeconds ? (
                  <span className="text-2xl font-bold text-primary">{formatTime(topPR.timeSeconds)}</span>
                ) : isJumpExercise && (topPR as any).distanceMeters ? (
                  <span className="text-2xl font-bold text-primary">{Math.round((topPR as any).distanceMeters * 100)} cm</span>
                ) : topPR.weight ? (
                  <>
                    <span className="text-2xl font-bold text-primary">{topPR.weight} kg</span>
                    {topPR.reps > 0 && (
                      <p className="text-sm text-muted-foreground">× {topPR.reps} opak.</p>
                    )}
                  </>
                ) : topPR.timeSeconds ? (
                  <span className="text-2xl font-bold text-primary">{formatTime(topPR.timeSeconds)}</span>
                ) : (topPR as any).distanceMeters ? (
                  <span className="text-2xl font-bold text-primary">{Math.round((topPR as any).distanceMeters * 100)} cm</span>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Records */}
      {recentRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Posledních 5 PR</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentRecords.map((pr, idx) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer group"
                  onClick={() => setEditEntryId(pr.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      idx === 0 && "bg-primary/20 text-primary",
                      idx === 1 && "bg-muted text-muted-foreground",
                      idx === 2 && "bg-warning/20 text-warning",
                      idx > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{pr.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(pr.date), 'd.M.yyyy', { locale: cs })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {/* For time-based exercises (cardio), prefer timeSeconds over distanceMeters */}
                      {isTimeBased && pr.timeSeconds ? (
                        <span className="font-bold">{formatTime(pr.timeSeconds)}</span>
                      ) : isJumpExercise && pr.distanceMeters ? (
                        <span className="font-bold">{Math.round(pr.distanceMeters * 100)} cm</span>
                      ) : pr.weight ? (
                        <>
                          <span className="font-bold">{pr.weight} kg</span>
                          {pr.reps > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">× {pr.reps}</span>
                          )}
                        </>
                      ) : pr.timeSeconds ? (
                        <span className="font-bold">{formatTime(pr.timeSeconds)}</span>
                      ) : pr.distanceMeters ? (
                        <span className="font-bold">{Math.round(pr.distanceMeters * 100)} cm</span>
                      ) : null}
                    </div>
                    <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Informace o cviku
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {exercise.movement_pattern && (
              <div>
                <p className="text-muted-foreground text-xs">Pohybový vzorec</p>
                <p className="font-medium">
                  {MOVEMENT_PATTERN_LABELS[exercise.movement_pattern] || exercise.movement_pattern}
                </p>
              </div>
            )}
            {exercise.difficulty && (
              <div>
                <p className="text-muted-foreground text-xs">Obtížnost</p>
                <Badge variant="outline" className="mt-0.5">
                  {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
                </Badge>
              </div>
            )}
          </div>

          {exercise.equipment && exercise.equipment.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Vybavení</p>
              <div className="flex flex-wrap gap-1">
                {exercise.equipment.map((eq) => (
                  <Badge key={eq} variant="secondary" className="text-xs">
                    {EQUIPMENT_LABELS[eq] || eq}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Svalové skupiny</p>
              <div className="flex flex-wrap gap-1">
                {exercise.muscle_groups.map((muscle) => (
                  <Badge key={muscle} variant="outline" className="text-xs">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {exercise.is_unilateral && <Badge variant="outline" className="text-xs">Unilaterální</Badge>}
            {exercise.is_bodyweight && <Badge variant="outline" className="text-xs">Vlastní váha</Badge>}
            {exercise.is_time_based && <Badge variant="outline" className="text-xs">Na čas</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Exercise Relations */}
      <ExerciseRelationsManager
        exerciseId={exercise.id}
        exerciseName={exercise.name_cs || exercise.name}
      />
      
      {/* Edit Entry Dialog */}
      <EditExerciseEntryDialog
        entryId={editEntryId}
        metricCategory={metricCategory}
        open={!!editEntryId}
        onOpenChange={(open) => {
          if (!open) setEditEntryId(null);
        }}
      />
    </div>
  );
}
