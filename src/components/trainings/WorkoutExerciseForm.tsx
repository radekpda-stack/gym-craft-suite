import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';

interface SetData {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

interface ExerciseFormData {
  exercise_id: string | null;
  exercise_name: string;
  sets: SetData[];
}

interface WorkoutExerciseFormProps {
  onAdd: (data: ExerciseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function WorkoutExerciseForm({ onAdd, onCancel, isLoading }: WorkoutExerciseFormProps) {
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [sets, setSets] = useState<SetData[]>([{ weight_kg: null, reps: null, rpe: null }]);

  const filteredExercises = useMemo(() => {
    if (!searchQuery) return exercises.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return exercises.filter(
      e => e.name.toLowerCase().includes(query) || 
           e.category.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [exercises, searchQuery]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCustomExerciseName('');
    setSearchOpen(false);
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { 
      weight_kg: lastSet?.weight_kg || null, 
      reps: lastSet?.reps || null, 
      rpe: null 
    }]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const handleSetChange = (index: number, field: keyof SetData, value: string) => {
    const newSets = [...sets];
    const numValue = value === '' ? null : parseFloat(value);
    newSets[index] = { ...newSets[index], [field]: numValue };
    setSets(newSets);
  };

  const handleSubmit = () => {
    const exerciseName = selectedExercise?.name || customExerciseName;
    if (!exerciseName.trim()) return;

    onAdd({
      exercise_id: selectedExercise?.id || null,
      exercise_name: exerciseName,
      sets: sets.filter(s => s.weight_kg !== null || s.reps !== null),
    });
  };

  const isValid = (selectedExercise || customExerciseName.trim()) && 
    sets.some(s => s.weight_kg !== null || s.reps !== null);

  return (
    <div className="glass rounded-xl p-4 sm:p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Přidat cvik
        </h4>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Exercise Search/Select */}
      <div className="space-y-2">
        <Label>Cvik</Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between bg-secondary border-border"
            >
              {selectedExercise ? (
                <span className="flex items-center gap-2">
                  {selectedExercise.name}
                  <Badge variant="outline" className="ml-2">
                    {selectedExercise.category}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">Vyberte nebo zadejte cvik...</span>
              )}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Hledat cviky..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 text-center text-sm">
                    <p className="text-muted-foreground">Cvik nenalezen</p>
                    <Button
                      variant="link"
                      className="mt-1"
                      onClick={() => {
                        setCustomExerciseName(searchQuery);
                        setSelectedExercise(null);
                        setSearchOpen(false);
                      }}
                    >
                      Použít "{searchQuery}" jako vlastní cvik
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredExercises.map((exercise) => (
                    <CommandItem
                      key={exercise.id}
                      value={exercise.name}
                      onSelect={() => handleSelectExercise(exercise)}
                    >
                      <div className="flex flex-col">
                        <span>{exercise.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {exercise.category}
                          {exercise.muscle_groups?.length > 0 && ` • ${exercise.muscle_groups.join(', ')}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Custom exercise name input */}
        {!selectedExercise && (
          <Input
            placeholder="Nebo zadejte vlastní název cviku..."
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            className="bg-secondary border-border"
          />
        )}
      </div>

      {/* Muscle groups display */}
      {selectedExercise && selectedExercise.muscle_groups && selectedExercise.muscle_groups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedExercise.muscle_groups.map((mg) => (
            <Badge key={mg} variant="secondary" className="text-xs">
              {mg}
            </Badge>
          ))}
        </div>
      )}

      {/* Sets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Série</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSet}
            className="h-8"
          >
            <Plus className="w-3 h-3 mr-1" />
            Přidat sérii
          </Button>
        </div>

        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
            <span className="w-8 text-center">#</span>
            <span>Váha (kg)</span>
            <span>Opak.</span>
            <span>RPE</span>
            <span className="w-8"></span>
          </div>

          {sets.map((set, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center"
            >
              <span className="w-8 text-center text-sm text-muted-foreground">
                {index + 1}
              </span>
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                value={set.weight_kg ?? ''}
                onChange={(e) => handleSetChange(index, 'weight_kg', e.target.value)}
                className="bg-secondary border-border h-9"
              />
              <Input
                type="number"
                placeholder="0"
                value={set.reps ?? ''}
                onChange={(e) => handleSetChange(index, 'reps', e.target.value)}
                className="bg-secondary border-border h-9"
              />
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="-"
                value={set.rpe ?? ''}
                onChange={(e) => handleSetChange(index, 'rpe', e.target.value)}
                className="bg-secondary border-border h-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => handleRemoveSet(index)}
                disabled={sets.length === 1}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Zrušit
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="flex-1"
        >
          {isLoading ? 'Ukládám...' : 'Přidat cvik'}
        </Button>
      </div>
    </div>
  );
}
