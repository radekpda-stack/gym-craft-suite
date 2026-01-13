import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { History, Loader2, ChevronLeft, ChevronRight, Trophy, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { detectExerciseMetricCategory, getPerformanceDisplay, getRpeBgColor } from '@/lib/exerciseMetrics';
import { formatTimeMs } from '@/lib/timeUtils';
import { EditExerciseEntryDialog } from './EditExerciseEntryDialog';
import { ExerciseEntryDetailSheet } from './ExerciseEntryDetailSheet';
import { AssistanceBandBadges, isPullUpExercise, type BandType } from './AssistanceBandSelector';

interface ExerciseHistoryTableProps {
  exerciseId: string;
  exerciseType: 'strength' | 'cardio' | 'mixed';
  clientId: string | null;
}

const PAGE_SIZE = 15;

function formatTimeDisplay(seconds: number, ms?: number | null): string {
  // Prefer ms for precision display
  if (ms !== null && ms !== undefined) {
    return formatTimeMs(ms);
  }
  // Fallback to seconds
  return formatTimeMs(seconds * 1000);
}

export function ExerciseHistoryTable({ exerciseId, exerciseType, clientId }: ExerciseHistoryTableProps) {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'time'>('date');
  const [editEntry, setEditEntry] = useState<{ id: string; metricCategory: string } | null>(null);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-history', exerciseId, clientId, sortBy],
    queryFn: async () => {
      // First, get exercise info to determine if it's time-based
      const { data: exercise } = await supabase
        .from('exercises')
        .select('is_time_based, category')
        .eq('id', exerciseId)
        .single();

      const isTimeBased = exercise?.is_time_based || 
        exercise?.category === 'cardio' || 
        exercise?.category === 'conditioning';

      // Fetch exercise entries (includes both strength and time-based entries)
      let exerciseQuery = supabase
        .from('exercise_entries')
        .select(`
          id,
          date,
          weight_kg,
          reps,
          sets,
          time_seconds,
          time_ms,
          notes,
          is_pr,
          client_id,
          training_type,
          avg_watts,
          pace_sec_per_500m,
          pace_sec_per_km,
          avg_speed_kmh,
          rpe,
          distance_meters,
          level,
          resistance,
          metrics_json,
          side,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId);

      if (clientId) {
        exerciseQuery = exerciseQuery.eq('client_id', clientId);
      }

      if (sortBy === 'date') {
        exerciseQuery = exerciseQuery.order('date', { ascending: false });
      } else if (sortBy === 'weight') {
        exerciseQuery = exerciseQuery.order('weight_kg', { ascending: false, nullsFirst: false });
      } else if (sortBy === 'time') {
        exerciseQuery = exerciseQuery.order('time_seconds', { ascending: true, nullsFirst: false });
      }

      const { data: exerciseEntries } = await exerciseQuery;

      // Get exercise name for category detection
      const { data: exerciseData } = await supabase
        .from('exercises')
        .select('name, name_cs, category')
        .eq('id', exerciseId)
        .single();

      const metricCategory = exerciseData 
        ? detectExerciseMetricCategory(exerciseData.name_cs || exerciseData.name || '', exerciseData.category)
        : 'strength';

      // Process exercise entries
      let rows = (exerciseEntries || []).map(entry => {
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;
        const timeSeconds = entry.time_seconds;
        const timeMs = (entry as any).time_ms as number | null | undefined;
        const distanceMeters = (entry as any).distance_meters as number | null | undefined;

        // Determine entry type
        const hasTime = !!timeSeconds && timeSeconds > 0;
        const hasWeight = weight > 0;
        const hasDistance = !!distanceMeters && distanceMeters > 0;

        // Get performance display using fallback logic
        const performanceDisplay = getPerformanceDisplay({
          avg_watts: (entry as any).avg_watts,
          pace_sec_per_500m: (entry as any).pace_sec_per_500m,
          pace_sec_per_km: (entry as any).pace_sec_per_km,
          avg_speed_kmh: (entry as any).avg_speed_kmh,
          time_seconds: entry.time_seconds,
          distance_meters: (entry as any).distance_meters,
        }, metricCategory);

        // Extract assistance bands from metrics_json
        const metricsJson = (entry as any).metrics_json as { assistance_bands?: BandType[] } | null;
        const assistanceBands = metricsJson?.assistance_bands || [];

        return {
          id: entry.id,
          type: hasTime ? ('time' as const) : hasDistance ? ('jump' as const) : ('strength' as const),
          date: entry.date,
          clientId: entry.client_id,
          clientName: (entry.clients as any)?.name || 'Neznámý',
          weight: hasWeight ? weight : null,
          reps: hasWeight ? reps : null,
          sets: hasWeight || hasDistance ? sets : null,
          volume: hasWeight ? volume : null,
          timeSeconds: hasTime ? timeSeconds : null,
          timeMs: hasTime ? (timeMs ?? null) : null,
          distanceMeters: hasDistance ? distanceMeters : null,
          distanceCm: hasDistance ? Math.round((distanceMeters || 0) * 100) : null,
          notes: entry.notes,
          // NOTE: we will re-compute PR in UI so edits reflect immediately
          isPR: false,
          trainingType: entry.training_type,
          rpe: (entry as any).rpe,
          level: (entry as any).level,
          resistance: (entry as any).resistance,
          performanceDisplay,
          assistanceBands,
          side: (entry as any).side as 'left' | 'right' | 'both' | 'none' | null,
          avgWatts: (entry as any).avg_watts as number | null,
        };
      });

      // Recompute true PRs from current rows so trophies update after edits
      const prIds = new Set<string>();
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        // Group by client only (exercise is fixed by exerciseId)
        const key = r.clientId;
        const list = groups.get(key) ?? [];
        list.push(r);
        groups.set(key, list);
      }

      for (const [, list] of groups) {
        const timeRows = list.filter(r => r.timeSeconds && r.timeSeconds > 0);
        const weightRows = list.filter(r => r.weight && r.weight > 0);
        const distanceRows = list.filter(r => r.distanceMeters && r.distanceMeters > 0);

        // Priority: Jump (distance/height) > Time > Strength
        const isJumpType = metricCategory === 'jump_height' || metricCategory === 'jump_distance' || metricCategory === 'plyometric';
        if (isJumpType && distanceRows.length) {
          // For jumps: higher distance/height is better
          const best = distanceRows
            .map(r => ({ id: r.id, v: r.distanceMeters!, date: r.date }))
            .sort((a, b) => b.v - a.v || new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          if (best) prIds.add(best.id);
        } else if (isTimeBased && timeRows.length) {
          const best = timeRows
            .map(r => ({ id: r.id, v: r.timeMs ?? (r.timeSeconds! * 1000), date: r.date }))
            .sort((a, b) => a.v - b.v || new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          if (best) prIds.add(best.id);
        } else if (!isTimeBased && weightRows.length) {
          const best = weightRows
            .map(r => ({ id: r.id, v: r.weight!, date: r.date }))
            .sort((a, b) => b.v - a.v || new Date(a.date).getTime() - new Date(b.date).getTime())[0];
          if (best) prIds.add(best.id);
        }
      }

      rows = rows.map(r => ({ ...r, isPR: prIds.has(r.id) }));

      // Check if this exercise is a pull-up type
      const exerciseName = exerciseData?.name_cs || exerciseData?.name || '';
      const isPullUp = isPullUpExercise(exerciseName);
      const isJumpExercise = metricCategory === 'jump_height' || metricCategory === 'jump_distance' || metricCategory === 'plyometric';

      return { rows, isTimeBased, isJumpExercise, metricCategory, isPullUp };
    },
    enabled: !!exerciseId,
  });

  const totalPages = Math.ceil((data?.rows?.length || 0) / PAGE_SIZE);
  const paginatedData = data?.rows?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.rows?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Historie výkonů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Zatím nejsou žádné záznamy.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isTimeBased = data.isTimeBased;
  const isJumpExercise = data.isJumpExercise;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-primary" />
            Historie výkonů
          </CardTitle>
          <StatInfoTooltip
            title="Historie výkonů"
            description="Přehled všech záznamů tohoto cviku."
            calculation="Záznamy jsou řazeny podle zvoleného kritéria. Kliknutím otevřete detail klienta."
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Podle data</SelectItem>
            {!isTimeBased && <SelectItem value="weight">Podle váhy</SelectItem>}
            {isTimeBased && <SelectItem value="time">Podle času</SelectItem>}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-3 px-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] sm:w-[100px]">Datum</TableHead>
                {!clientId && <TableHead className="min-w-[80px]">Klient</TableHead>}
                {isJumpExercise ? (
                  <>
                    <TableHead className="text-right min-w-[60px]">Pokusy</TableHead>
                    <TableHead className="text-right min-w-[70px]">Vzdálenost</TableHead>
                    <TableHead className="text-center w-[45px] hidden sm:table-cell">RPE</TableHead>
                    <TableHead className="max-w-[100px] hidden lg:table-cell">Pozn.</TableHead>
                  </>
                ) : isTimeBased ? (
                  <>
                    <TableHead className="text-right min-w-[70px]">Čas</TableHead>
                    <TableHead className="text-right min-w-[60px] hidden sm:table-cell">Tempo</TableHead>
                    <TableHead className="text-right min-w-[50px] hidden sm:table-cell">Watty</TableHead>
                    <TableHead className="text-center w-[60px] hidden md:table-cell">Lvl</TableHead>
                    <TableHead className="text-center w-[45px] hidden sm:table-cell">RPE</TableHead>
                    <TableHead className="max-w-[100px] hidden lg:table-cell">Pozn.</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-right min-w-[60px]">Série</TableHead>
                    <TableHead className="text-right min-w-[70px]">Výkon</TableHead>
                    <TableHead className="text-right min-w-[70px] hidden sm:table-cell">Objem</TableHead>
                    <TableHead className="text-center w-[45px] hidden sm:table-cell">RPE</TableHead>
                    <TableHead className="max-w-[100px] hidden lg:table-cell">Pozn.</TableHead>
                  </>
                )}
                <TableHead className="w-[36px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setDetailEntryId(row.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {row.isPR && <Trophy className="w-3 h-3 text-primary" />}
                      {row.side && (row.side === 'left' || row.side === 'right') && (
                        <span className={cn(
                          "text-[10px] font-bold px-1 rounded",
                          row.side === 'left' ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                        )}>
                          {row.side === 'left' ? 'L' : 'R'}
                        </span>
                      )}
                      {format(new Date(row.date), 'd.M.yy', { locale: cs })}
                    </div>
                  </TableCell>
                  {!clientId && (
                    <TableCell>{row.clientName}</TableCell>
                  )}
                  {isJumpExercise ? (
                    <>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {row.sets ? `${row.sets}×` : '1×'}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {row.distanceCm ? `${row.distanceCm} cm` : '-'}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {row.rpe ? (
                          <Badge className={cn("text-xs px-1.5 py-0.5", getRpeBgColor(row.rpe))}>
                            {row.rpe}
                          </Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-sm hidden lg:table-cell">
                        {row.notes || '-'}
                      </TableCell>
                    </>
                  ) : isTimeBased ? (
                    <>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {row.timeMs ? formatTimeDisplay(row.timeSeconds || 0, row.timeMs) : row.timeSeconds ? formatTimeDisplay(row.timeSeconds) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell">
                        {row.performanceDisplay?.value 
                          ? `${row.performanceDisplay.value}${row.performanceDisplay.unit ? ` ${row.performanceDisplay.unit}` : ''}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell">
                        {row.avgWatts ? `${Math.round(row.avgWatts)} W` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground hidden md:table-cell">
                        {row.level || row.resistance ? (
                          <span>
                            {row.level ? `L${row.level}` : ''}
                            {row.level && row.resistance ? '/' : ''}
                            {row.resistance ? `M${row.resistance}` : ''}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {row.rpe ? (
                          <Badge className={cn("text-xs px-1.5 py-0.5", getRpeBgColor(row.rpe))}>
                            {row.rpe}
                          </Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-sm hidden lg:table-cell">
                        {row.notes || '-'}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {row.sets && row.reps ? `${row.sets}×${row.reps}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{row.weight ? `${row.weight} kg` : row.distanceCm ? `${row.distanceCm} cm` : row.timeSeconds ? formatTimeDisplay(row.timeSeconds) : '-'}</span>
                          {data?.isPullUp && row.assistanceBands && row.assistanceBands.length > 0 && (
                            <AssistanceBandBadges bands={row.assistanceBands} className="justify-end" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                        {row.volume ? `${row.volume} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {row.rpe ? (
                          <Badge className={cn("text-xs px-1.5 py-0.5", getRpeBgColor(row.rpe))}>
                            {row.rpe}
                          </Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-sm hidden lg:table-cell">
                        {row.notes || '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditEntry({ id: row.id, metricCategory: data?.metricCategory ?? 'strength' });
                      }}
                      aria-label="Upravit záznam"
                      title="Upravit záznam"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {data.rows.length} záznamů celkem
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      </Card>

      <EditExerciseEntryDialog
        entryId={editEntry?.id ?? null}
        metricCategory={editEntry?.metricCategory ?? null}
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
      />

      <ExerciseEntryDetailSheet
        entryId={detailEntryId}
        exerciseId={exerciseId}
        open={!!detailEntryId}
        onOpenChange={(open) => !open && setDetailEntryId(null)}
      />
    </>
  );
}
