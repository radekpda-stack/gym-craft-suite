import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { History, Loader2, ChevronLeft, ChevronRight, Trophy, ExternalLink, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { detectExerciseMetricCategory, getPerformanceDisplay, getRpeBgColor } from '@/lib/exerciseMetrics';
import { formatTimeMs } from '@/lib/timeUtils';
import { EditExerciseEntryDialog } from './EditExerciseEntryDialog';

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
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'time'>('date');
  const [editEntry, setEditEntry] = useState<{ id: string; metricCategory: string } | null>(null);

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
      const rows = (exerciseEntries || []).map(entry => {
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;
        const timeSeconds = entry.time_seconds;
        const timeMs = (entry as any).time_ms;
        
        // Determine entry type
        const hasTime = timeSeconds && timeSeconds > 0;
        const hasWeight = weight > 0;

        // Get performance display using fallback logic
        const performanceDisplay = getPerformanceDisplay({
          avg_watts: (entry as any).avg_watts,
          pace_sec_per_500m: (entry as any).pace_sec_per_500m,
          pace_sec_per_km: (entry as any).pace_sec_per_km,
          avg_speed_kmh: (entry as any).avg_speed_kmh,
          time_seconds: entry.time_seconds,
          distance_meters: (entry as any).distance_meters,
        }, metricCategory);

        return {
          id: entry.id,
          type: hasTime ? 'time' as const : 'strength' as const,
          date: entry.date,
          clientId: entry.client_id,
          clientName: (entry.clients as any)?.name || 'Neznámý',
          weight: hasWeight ? weight : null,
          reps: hasWeight ? reps : null,
          sets: hasWeight ? sets : null,
          volume: hasWeight ? volume : null,
          timeSeconds: hasTime ? timeSeconds : null,
          timeMs: hasTime ? timeMs : null,
          notes: entry.notes,
          isPR: entry.is_pr,
          trainingType: entry.training_type,
          rpe: (entry as any).rpe,
          level: (entry as any).level,
          resistance: (entry as any).resistance,
          performanceDisplay,
        };
      });

      return { rows, isTimeBased, metricCategory };
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Datum</TableHead>
                {!clientId && <TableHead>Klient</TableHead>}
                {isTimeBased ? (
                  <>
                    <TableHead className="text-right">Čas</TableHead>
                    <TableHead className="text-right">Tempo/Výkon</TableHead>
                    <TableHead className="text-center w-[70px]">Lvl/Mag</TableHead>
                    <TableHead className="text-center w-[50px]">RPE</TableHead>
                    <TableHead className="max-w-[120px]">Poznámka</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-right">Série</TableHead>
                    <TableHead className="text-right">Výkon</TableHead>
                    <TableHead className="text-right">Objem</TableHead>
                    <TableHead className="text-center w-[50px]">RPE</TableHead>
                    <TableHead className="max-w-[150px]">Poznámka</TableHead>
                  </>
                )}
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/clients/${row.clientId}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {row.isPR && <Trophy className="w-3 h-3 text-primary" />}
                      {format(new Date(row.date), 'd.M.yy', { locale: cs })}
                    </div>
                  </TableCell>
                  {!clientId && (
                    <TableCell>{row.clientName}</TableCell>
                  )}
                  {isTimeBased ? (
                    <>
                      <TableCell className="text-right font-medium">
                        {row.timeMs ? formatTimeDisplay(row.timeSeconds || 0, row.timeMs) : row.timeSeconds ? formatTimeDisplay(row.timeSeconds) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.performanceDisplay?.value 
                          ? `${row.performanceDisplay.value}${row.performanceDisplay.unit ? ` ${row.performanceDisplay.unit}` : ''}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {row.level || row.resistance ? (
                          <span>
                            {row.level ? `L${row.level}` : ''}
                            {row.level && row.resistance ? '/' : ''}
                            {row.resistance ? `M${row.resistance}` : ''}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.rpe ? (
                          <Badge className={cn("text-xs px-1.5 py-0.5", getRpeBgColor(row.rpe))}>
                            {row.rpe}
                          </Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-muted-foreground text-sm">
                        {row.notes || '-'}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        {row.sets && row.reps ? `${row.sets}×${row.reps}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.weight ? `${row.weight} kg` : row.timeSeconds ? formatTimeDisplay(row.timeSeconds) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.volume ? `${row.volume} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.rpe ? (
                          <Badge className={cn("text-xs px-1.5 py-0.5", getRpeBgColor(row.rpe))}>
                            {row.rpe}
                          </Badge>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground text-sm">
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
                  <TableCell>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
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
    </>
  );
}
