import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Trash2, Edit2, MoreVertical, Dumbbell, Clock, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExerciseEntryWithClient, useExerciseEntries } from '@/hooks/useExerciseEntries';

interface ProgressListProps {
  entries: ExerciseEntryWithClient[];
  showClient?: boolean;
}

/**
 * Calculate true PRs - only the best (highest weight) for each exercise per client
 */
function calculateTruePRs(entries: ExerciseEntryWithClient[]): Set<string> {
  const prIds = new Set<string>();
  
  // Group entries by client_id and exercise_name
  const exerciseGroups = new Map<string, ExerciseEntryWithClient[]>();
  
  entries.forEach(entry => {
    if (!entry.weight_kg) return; // Skip entries without weight
    
    const key = `${entry.client_id}-${entry.exercise_name}`;
    if (!exerciseGroups.has(key)) {
      exerciseGroups.set(key, []);
    }
    exerciseGroups.get(key)!.push(entry);
  });
  
  // For each group, find the entry with highest weight
  exerciseGroups.forEach(groupEntries => {
    const maxWeight = Math.max(...groupEntries.map(e => e.weight_kg || 0));
    // Find the FIRST entry with max weight (oldest PR counts)
    const prEntry = groupEntries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .find(e => e.weight_kg === maxWeight);
    
    if (prEntry) {
      prIds.add(prEntry.id);
    }
  });
  
  return prIds;
}

export function ProgressList({ entries, showClient = true }: ProgressListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { deleteEntry } = useExerciseEntries();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEntry.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (!entries.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Zatím žádné záznamy</p>
      </div>
    );
  }

  // Group entries by date
  const groupedByDate = entries.reduce((acc, entry) => {
    const dateKey = entry.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, ExerciseEntryWithClient[]>);

  // Calculate true PRs based on best weight per exercise per client
  const truePRs = calculateTruePRs(entries);

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, dayEntries]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {format(new Date(date), 'EEEE d. MMMM yyyy', { locale: cs })}
            </h3>
            <div className="space-y-2">
              {dayEntries.map((entry) => {
                // Use calculated true PR status instead of database value
                const isActualPR = truePRs.has(entry.id);
                
                return (
                  <Card key={entry.id} className="glass-subtle hover:bg-accent/5 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{entry.exercise_name}</span>
                            {isActualPR && (
                              <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <Trophy className="w-3 h-3" /> PR
                              </Badge>
                            )}
                          </div>
                        
                        {showClient && entry.clients && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <User className="w-3 h-3" />
                            {entry.clients.name}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium text-primary">
                            {entry.sets}×{entry.reps || '—'}
                          </span>
                          {entry.is_bodyweight ? (
                            <span className="text-muted-foreground">vlastní váha</span>
                          ) : entry.weight_kg ? (
                            <span>{entry.weight_kg} kg</span>
                          ) : null}
                          {entry.time_seconds && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {entry.time_seconds}s
                            </span>
                          )}
                          {entry.tempo && (
                            <span className="text-muted-foreground">
                              tempo: {entry.tempo}
                            </span>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {entry.notes}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Smazat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Záznam bude trvale odstraněn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
