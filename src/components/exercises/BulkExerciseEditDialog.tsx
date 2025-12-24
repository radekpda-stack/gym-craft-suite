import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkExerciseUpdate, BulkUpdateData } from '@/hooks/useBulkExerciseUpdate';
import { MOVEMENT_PATTERNS, DIFFICULTIES } from '@/hooks/useExercises';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Exercise {
  id: string;
  name: string;
  name_cs?: string | null;
  category: string;
  movement_pattern?: string | null;
  difficulty?: string | null;
  muscle_groups?: string[] | null;
}

interface BulkExerciseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExercises: Exercise[];
  onComplete: () => void;
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
  diagonal_press: 'Diagonální tlak',
  other: 'Ostatní',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Začátečník',
  intermediate: 'Pokročilý',
  advanced: 'Expert',
};

const MUSCLE_GROUPS = [
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors',
  'chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps',
  'core', 'obliques', 'traps', 'rhomboids', 'rear delts', 'grip'
];

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstringy',
  glutes: 'Hýždě',
  calves: 'Lýtka',
  adductors: 'Adduktory',
  chest: 'Hrudník',
  back: 'Záda',
  lats: 'Latissimus',
  shoulders: 'Ramena',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  obliques: 'Šikmé břišní',
  traps: 'Trapézy',
  rhomboids: 'Rhomboidy',
  'rear delts': 'Zadní delty',
  grip: 'Úchop',
};

export function BulkExerciseEditDialog({
  open,
  onOpenChange,
  selectedExercises,
  onComplete,
}: BulkExerciseEditDialogProps) {
  const [movementPattern, setMovementPattern] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [addMuscleGroups, setAddMuscleGroups] = useState<string[]>([]);
  const [removeMuscleGroups, setRemoveMuscleGroups] = useState<string[]>([]);
  const [addTagIds, setAddTagIds] = useState<string[]>([]);
  const [removeTagIds, setRemoveTagIds] = useState<string[]>([]);

  const bulkUpdate = useBulkExerciseUpdate();

  // Fetch available tags
  const { data: tags = [] } = useQuery({
    queryKey: ['tags-for-bulk-edit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tags')
        .select('id, name, color')
        .order('name');
      return data || [];
    },
  });

  const handleSubmit = async () => {
    const updates: BulkUpdateData = {};

    if (movementPattern) updates.movement_pattern = movementPattern;
    if (difficulty) updates.difficulty = difficulty;
    if (addMuscleGroups.length > 0) updates.add_muscle_groups = addMuscleGroups;
    if (removeMuscleGroups.length > 0) updates.remove_muscle_groups = removeMuscleGroups;
    if (addTagIds.length > 0) updates.add_tag_ids = addTagIds;
    if (removeTagIds.length > 0) updates.remove_tag_ids = removeTagIds;

    if (Object.keys(updates).length === 0) {
      return;
    }

    await bulkUpdate.mutateAsync({
      exerciseIds: selectedExercises.map((e) => e.id),
      updates,
    });

    // Reset form
    setMovementPattern('');
    setDifficulty('');
    setAddMuscleGroups([]);
    setRemoveMuscleGroups([]);
    setAddTagIds([]);
    setRemoveTagIds([]);

    onComplete();
  };

  const toggleMuscleGroup = (group: string, mode: 'add' | 'remove') => {
    if (mode === 'add') {
      setAddMuscleGroups((prev) =>
        prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
      );
      // Remove from other list
      setRemoveMuscleGroups((prev) => prev.filter((g) => g !== group));
    } else {
      setRemoveMuscleGroups((prev) =>
        prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
      );
      // Remove from other list
      setAddMuscleGroups((prev) => prev.filter((g) => g !== group));
    }
  };

  const toggleTag = (tagId: string, mode: 'add' | 'remove') => {
    if (mode === 'add') {
      setAddTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
      );
      setRemoveTagIds((prev) => prev.filter((t) => t !== tagId));
    } else {
      setRemoveTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
      );
      setAddTagIds((prev) => prev.filter((t) => t !== tagId));
    }
  };

  const hasChanges =
    movementPattern ||
    difficulty ||
    addMuscleGroups.length > 0 ||
    removeMuscleGroups.length > 0 ||
    addTagIds.length > 0 ||
    removeTagIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Hromadná úprava cviků</DialogTitle>
          <DialogDescription>
            Upravíte {selectedExercises.length} vybraných cviků. Změny se provedou pouze pro vyplněná pole.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Selected exercises preview */}
            <div>
              <Label className="text-sm font-medium">Vybrané cviky:</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedExercises.slice(0, 10).map((exercise) => (
                  <Badge key={exercise.id} variant="secondary" className="text-xs">
                    {exercise.name_cs || exercise.name}
                  </Badge>
                ))}
                {selectedExercises.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedExercises.length - 10} dalších
                  </Badge>
                )}
              </div>
            </div>

            {/* Movement Pattern */}
            <div className="space-y-2">
              <Label>Pohybový vzorec</Label>
              <Select value={movementPattern} onValueChange={setMovementPattern}>
                <SelectTrigger>
                  <SelectValue placeholder="Neměnit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Neměnit</SelectItem>
                  {MOVEMENT_PATTERNS.map((pattern) => (
                    <SelectItem key={pattern} value={pattern}>
                      {MOVEMENT_PATTERN_LABELS[pattern] || pattern}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label>Obtížnost</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Neměnit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Neměnit</SelectItem>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                      {DIFFICULTY_LABELS[diff] || diff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Muscle Groups */}
            <div className="space-y-3">
              <Label>Svalové skupiny</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MUSCLE_GROUPS.map((group) => {
                  const isAdding = addMuscleGroups.includes(group);
                  const isRemoving = removeMuscleGroups.includes(group);
                  
                  return (
                    <div
                      key={group}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card"
                    >
                      <span className="flex-1 text-sm">
                        {MUSCLE_GROUP_LABELS[group] || group}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant={isAdding ? 'default' : 'ghost'}
                        className="h-6 w-6"
                        onClick={() => toggleMuscleGroup(group, 'add')}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant={isRemoving ? 'destructive' : 'ghost'}
                        className="h-6 w-6"
                        onClick={() => toggleMuscleGroup(group, 'remove')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                ✓ = přidat, ✕ = odebrat
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <Label>Tagy</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tags.map((tag) => {
                  const isAdding = addTagIds.includes(tag.id);
                  const isRemoving = removeTagIds.includes(tag.id);
                  
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded-md border bg-card"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-sm truncate">{tag.name}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant={isAdding ? 'default' : 'ghost'}
                        className="h-6 w-6"
                        onClick={() => toggleTag(tag.id, 'add')}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant={isRemoving ? 'destructive' : 'ghost'}
                        className="h-6 w-6"
                        onClick={() => toggleTag(tag.id, 'remove')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || bulkUpdate.isPending}
          >
            {bulkUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit změny ({selectedExercises.length} cviků)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
