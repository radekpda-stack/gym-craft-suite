import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Check, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useExercises } from '@/hooks/useExercises';

interface UnmatchedEntry {
  exercise_name: string;
  count: number;
  table: 'workout_entries' | 'exercise_entries';
}

export function UnmatchedEntriesManager() {
  const [selectedEntry, setSelectedEntry] = useState<UnmatchedEntry | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  const { exercises } = useExercises();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Find entries without exercise_id
  const { data: unmatchedEntries = [], isLoading, refetch } = useQuery({
    queryKey: ['unmatched-entries'],
    queryFn: async () => {
      const results: UnmatchedEntry[] = [];

      // Check workout_entries
      const { data: workoutUnmatched } = await supabase
        .from('workout_entries')
        .select('exercise_name')
        .is('exercise_id', null);

      if (workoutUnmatched && workoutUnmatched.length > 0) {
        const counts = new Map<string, number>();
        workoutUnmatched.forEach(entry => {
          counts.set(entry.exercise_name, (counts.get(entry.exercise_name) || 0) + 1);
        });
        counts.forEach((count, name) => {
          results.push({ exercise_name: name, count, table: 'workout_entries' });
        });
      }

      // Check exercise_entries
      const { data: exerciseUnmatched } = await supabase
        .from('exercise_entries')
        .select('exercise_name')
        .is('exercise_id', null);

      if (exerciseUnmatched && exerciseUnmatched.length > 0) {
        const counts = new Map<string, number>();
        exerciseUnmatched.forEach(entry => {
          counts.set(entry.exercise_name, (counts.get(entry.exercise_name) || 0) + 1);
        });
        counts.forEach((count, name) => {
          const existing = results.find(r => r.exercise_name === name);
          if (existing) {
            existing.count += count;
          } else {
            results.push({ exercise_name: name, count, table: 'exercise_entries' });
          }
        });
      }

      return results.sort((a, b) => b.count - a.count);
    },
  });

  const assignExercise = useMutation({
    mutationFn: async ({ exerciseName, exerciseId }: { exerciseName: string; exerciseId: string }) => {
      // Update workout_entries
      await supabase
        .from('workout_entries')
        .update({ exercise_id: exerciseId })
        .eq('exercise_name', exerciseName)
        .is('exercise_id', null);

      // Update exercise_entries
      await supabase
        .from('exercise_entries')
        .update({ exercise_id: exerciseId })
        .eq('exercise_name', exerciseName)
        .is('exercise_id', null);

      return { exerciseName, exerciseId };
    },
    onSuccess: ({ exerciseName }) => {
      queryClient.invalidateQueries({ queryKey: ['unmatched-entries'] });
      toast({
        title: 'Záznamy přiřazeny',
        description: `Záznamy pro "${exerciseName}" byly přiřazeny k vybranému cviku.`,
      });
      setShowAssignDialog(false);
      setSelectedEntry(null);
      setSelectedExerciseId('');
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přiřadit záznamy.',
        variant: 'destructive',
      });
    },
  });

  const handleAssign = () => {
    if (!selectedEntry || !selectedExerciseId) return;
    assignExercise.mutate({
      exerciseName: selectedEntry.exercise_name,
      exerciseId: selectedExerciseId,
    });
  };

  const openAssignDialog = (entry: UnmatchedEntry) => {
    setSelectedEntry(entry);
    setSelectedExerciseId('');
    setShowAssignDialog(true);
  };

  const activeExercises = exercises.filter(e => !e.is_archived);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Nepřiřazené záznamy
        </CardTitle>
        <CardDescription>
          Záznamy tréninků bez přiřazeného cviku (legacy data).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unmatchedEntries.length === 0 ? (
          <div className="flex items-center gap-2 text-success py-4">
            <Check className="h-5 w-5" />
            <span>Všechny záznamy mají přiřazený cvik.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {unmatchedEntries.length} názvů bez přiřazeného cviku 
                ({unmatchedEntries.reduce((sum, e) => sum + e.count, 0)} záznamů celkem)
              </span>
            </div>

            <div className="space-y-2">
              {unmatchedEntries.map((entry) => (
                <div 
                  key={entry.exercise_name}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                >
                  <div className="space-y-1">
                    <span className="font-medium">{entry.exercise_name}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {entry.count} záznamů
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openAssignDialog(entry)}
                    className="gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    Přiřadit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Přiřadit ke cviku</DialogTitle>
              <DialogDescription>
                Vyberte cvik, ke kterému mají být záznamy "{selectedEntry?.exercise_name}" přiřazeny.
              </DialogDescription>
            </DialogHeader>

            <Command className="border rounded-lg">
              <CommandInput placeholder="Hledat cvik..." />
              <CommandList className="max-h-60">
                <CommandEmpty>Žádný cvik nenalezen.</CommandEmpty>
                <CommandGroup>
                  {activeExercises.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name_cs || exercise.name}
                      onSelect={() => setSelectedExerciseId(exercise.id)}
                      className={selectedExerciseId === exercise.id ? 'bg-primary/10' : ''}
                    >
                      <Check 
                        className={`mr-2 h-4 w-4 ${
                          selectedExerciseId === exercise.id ? 'opacity-100' : 'opacity-0'
                        }`} 
                      />
                      <span>{exercise.name_cs || exercise.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {exercise.category}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Zrušit
              </Button>
              <Button 
                onClick={handleAssign}
                disabled={!selectedExerciseId || assignExercise.isPending}
              >
                {assignExercise.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Přiřadit záznamy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
