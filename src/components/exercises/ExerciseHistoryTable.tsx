import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Loader2, ChevronLeft, ChevronRight, Trophy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';

interface ExerciseHistoryTableProps {
  exerciseId: string;
  exerciseType: 'strength' | 'cardio' | 'mixed';
  clientId: string | null;
}

const PAGE_SIZE = 15;

export function ExerciseHistoryTable({ exerciseId, exerciseType, clientId }: ExerciseHistoryTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'volume'>('date');

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-history', exerciseId, clientId, sortBy],
    queryFn: async () => {
      // Fetch strength entries
      let strengthQuery = supabase
        .from('exercise_entries')
        .select(`
          id,
          date,
          weight_kg,
          reps,
          sets,
          notes,
          is_pr,
          client_id,
          training_type,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId);

      if (clientId) {
        strengthQuery = strengthQuery.eq('client_id', clientId);
      }

      if (sortBy === 'date') {
        strengthQuery = strengthQuery.order('date', { ascending: false });
      } else if (sortBy === 'weight') {
        strengthQuery = strengthQuery.order('weight_kg', { ascending: false, nullsFirst: false });
      }

      const { data: strengthEntries } = await strengthQuery;

      // Fetch cardio entries
      let cardioQuery = supabase
        .from('cardio_entries')
        .select(`
          id,
          date,
          duration_seconds,
          distance_meters,
          avg_watts,
          avg_speed_kmh,
          rpe,
          notes,
          is_pr,
          client_id,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId);

      if (clientId) {
        cardioQuery = cardioQuery.eq('client_id', clientId);
      }

      cardioQuery = cardioQuery.order('date', { ascending: false });

      const { data: cardioEntries } = await cardioQuery;

      // Process and merge data
      const strengthRows = (strengthEntries || []).map(entry => {
        const weight = entry.weight_kg || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;

        return {
          id: entry.id,
          type: 'strength' as const,
          date: entry.date,
          clientId: entry.client_id,
          clientName: (entry.clients as any)?.name || 'Neznámý',
          weight,
          reps,
          sets,
          volume,
          notes: entry.notes,
          isPR: entry.is_pr,
          trainingType: entry.training_type,
          // Cardio fields null
          duration: null,
          distance: null,
          pace: null,
          watts: null,
          rpe: null,
        };
      });

      const cardioRows = (cardioEntries || []).map(entry => {
        const distance = entry.distance_meters ? entry.distance_meters / 1000 : null;
        const duration = entry.duration_seconds ? entry.duration_seconds / 60 : null;
        const pace = distance && duration ? duration / distance : null;

        return {
          id: entry.id,
          type: 'cardio' as const,
          date: entry.date,
          clientId: entry.client_id,
          clientName: (entry.clients as any)?.name || 'Neznámý',
          // Strength fields null
          weight: null,
          reps: null,
          sets: null,
          volume: null,
          notes: entry.notes,
          isPR: entry.is_pr,
          trainingType: null,
          // Cardio fields
          duration,
          distance,
          pace,
          watts: entry.avg_watts,
          rpe: entry.rpe,
        };
      });

      // Combine and sort
      let allRows = [...strengthRows, ...cardioRows];

      if (sortBy === 'date') {
        allRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (sortBy === 'weight') {
        allRows.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      } else if (sortBy === 'volume') {
        allRows.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      }

      return allRows;
    },
    enabled: !!exerciseId,
  });

  const totalPages = Math.ceil((data?.length || 0) / PAGE_SIZE);
  const paginatedData = data?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
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

  const isStrengthView = exerciseType === 'strength' || exerciseType === 'mixed';
  const isCardioView = exerciseType === 'cardio' || exerciseType === 'mixed';

  return (
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
            <SelectItem value="weight">Podle váhy</SelectItem>
            <SelectItem value="volume">Podle objemu</SelectItem>
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
                {isStrengthView && (
                  <>
                    <TableHead className="text-right">Série</TableHead>
                    <TableHead className="text-right">Výkon</TableHead>
                    <TableHead className="text-right">Objem</TableHead>
                  </>
                )}
                {isCardioView && (
                  <>
                    <TableHead className="text-right">Čas</TableHead>
                    <TableHead className="text-right">Tempo/Výkon</TableHead>
                  </>
                )}
                <TableHead className="text-center">RPE</TableHead>
                <TableHead className="max-w-[200px]">Poznámka</TableHead>
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
                  {isStrengthView && row.type === 'strength' && (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        {row.sets}×{row.reps}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.weight ? `${row.weight} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.volume ? `${row.volume} kg` : '-'}
                      </TableCell>
                    </>
                  )}
                  {isStrengthView && row.type === 'cardio' && (
                    <>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </>
                  )}
                  {isCardioView && row.type === 'cardio' && (
                    <>
                      <TableCell className="text-right text-muted-foreground">
                        {row.duration ? `${Math.floor(row.duration)}:${String(Math.round((row.duration % 1) * 60)).padStart(2, '0')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.pace ? `${row.pace.toFixed(2)} min/km` : row.watts ? `${row.watts} W` : '-'}
                      </TableCell>
                    </>
                  )}
                  {isCardioView && row.type === 'strength' && (
                    <>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </>
                  )}
                  <TableCell className="text-center">
                    {row.rpe ? (
                      <Badge variant="secondary" className="text-muted-foreground">
                        {row.rpe}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                    {row.notes || '-'}
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
              {data.length} záznamů celkem
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
  );
}
