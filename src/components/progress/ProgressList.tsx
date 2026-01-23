import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Trophy, Trash2, Edit2, MoreVertical, Dumbbell, Clock, User, Heart, Zap, MapPin, Timer } from 'lucide-react';
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
import { ExerciseEntry, useExerciseEntries } from '@/hooks/useExerciseEntries';
import { EditEntryDialog } from './EditEntryDialog';
import type { UnifiedExerciseEntry } from '@/hooks/useAllExerciseEntries';

interface ProgressListProps {
  entries: UnifiedExerciseEntry[];
  showClient?: boolean;
}

/**
 * Format seconds to mm:ss format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate true PRs - best weight (higher) OR best time (lower) for each exercise per client
 */
function calculateTruePRs(entries: UnifiedExerciseEntry[]): Set<string> {
  const prIds = new Set<string>();
  
  // Group entries by client_id and exercise_name
  const exerciseGroups = new Map<string, UnifiedExerciseEntry[]>();
  
  entries.forEach(entry => {
    // Skip entries without weight or time
    if (!entry.weight_kg && !entry.time_seconds && !entry.duration_seconds) return;
    
    const key = `${entry.client_id}-${entry.exercise_name}`;
    if (!exerciseGroups.has(key)) {
      exerciseGroups.set(key, []);
    }
    exerciseGroups.get(key)!.push(entry);
  });
  
  // For each group, find the PR entry
  exerciseGroups.forEach(groupEntries => {
    const hasTimeEntries = groupEntries.some(e => (e.time_seconds && e.time_seconds > 0) || (e.duration_seconds && e.duration_seconds > 0));
    const hasWeightEntries = groupEntries.some(e => e.weight_kg && e.weight_kg > 0);
    
    if (hasTimeEntries && !hasWeightEntries) {
      // Time-based exercise: lower time is better
      const entriesWithTime = groupEntries.filter(e => (e.time_seconds || e.duration_seconds));
      const getTime = (e: UnifiedExerciseEntry) => e.time_seconds || e.duration_seconds || Infinity;
      const minTime = Math.min(...entriesWithTime.map(getTime));
      const prEntry = entriesWithTime
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .find(e => getTime(e) === minTime);
      
      if (prEntry) {
        prIds.add(prEntry.id);
      }
    } else if (hasWeightEntries) {
      // Weight-based exercise: higher weight is better
      const entriesWithWeight = groupEntries.filter(e => e.weight_kg && e.weight_kg > 0);
      const maxWeight = Math.max(...entriesWithWeight.map(e => e.weight_kg!));
      const prEntry = entriesWithWeight
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .find(e => e.weight_kg === maxWeight);
      
      if (prEntry) {
        prIds.add(prEntry.id);
      }
    }
  });
  
  return prIds;
}

export function ProgressList({ entries, showClient = true }: ProgressListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<UnifiedExerciseEntry | null>(null);
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
  }, {} as Record<string, UnifiedExerciseEntry[]>);

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
                            {entry.entry_type === 'cardio' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                            {entry.entry_type === 'skill' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="font-semibold">{entry.exercise_name}</span>
                            {isActualPR && (
                              <Badge className="gap-1 bg-warning/20 text-warning border-warning/30">
                                <Trophy className="w-3 h-3" /> PR
                              </Badge>
                            )}
                            {entry.is_breakthrough && entry.entry_type === 'skill' && (
                              <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                                <Zap className="w-3 h-3" /> Průlom
                              </Badge>
                            )}
                          </div>
                        
                        {showClient && entry.clients && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <User className="w-3 h-3" />
                            {entry.clients.name}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                          {/* Strength metrics */}
                          {entry.entry_type === 'strength' && (
                            <>
                              <span className="font-medium text-primary">
                                {entry.sets}×{entry.reps || '—'}
                              </span>
                              {entry.is_bodyweight ? (
                                <span className="text-muted-foreground">vlastní váha</span>
                              ) : entry.weight_kg ? (
                                <span>{entry.weight_kg} kg</span>
                              ) : null}
                            </>
                          )}
                          
                          {/* Cardio metrics */}
                          {entry.entry_type === 'cardio' && (
                            <>
                              {entry.duration_seconds && (
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {formatTime(entry.duration_seconds)}
                                </span>
                              )}
                              {entry.distance_meters && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {entry.distance_meters >= 1000 
                                    ? `${(entry.distance_meters / 1000).toFixed(2)} km`
                                    : `${entry.distance_meters} m`}
                                </span>
                              )}
                              {entry.avg_heart_rate && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Heart className="w-3 h-3" />
                                  {entry.avg_heart_rate} bpm
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* Skill metrics */}
                          {entry.entry_type === 'skill' && (
                            <>
                              {entry.attempts && (
                                <span>{entry.successful || 0}/{entry.attempts} úspěšných</span>
                              )}
                              {entry.technique_rating && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.technique_rating}
                                </Badge>
                              )}
                            </>
                          )}
                          
                          {entry.time_seconds && entry.entry_type === 'strength' && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatTime(entry.time_seconds)}
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
                          {/* Edit only available for strength entries */}
                          {entry.entry_type === 'strength' && (
                            <DropdownMenuItem onClick={() => setEditEntry(entry)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Upravit
                            </DropdownMenuItem>
                          )}
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

      {/* Only show edit dialog for strength entries */}
      {editEntry && editEntry.entry_type === 'strength' && (
        <EditEntryDialog
          entry={editEntry as any}
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
        />
      )}
    </>
  );
}
