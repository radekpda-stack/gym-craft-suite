import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Search, Dumbbell, Trophy, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';
import { parseTimeToMs, formatTimeMs, parsePaceToMs, formatPaceMs, msToSeconds } from '@/lib/timeUtils';

interface SetData {
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  time_seconds: number | null;
  time_ms: number | null; // High-precision time in milliseconds
  distance_meters: number | null;
  calories: number | null;
  watts: number | null;
  is_pr: boolean;
  // Cardio machine specific fields
  heart_rate_zone: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  pace_per_500m: number | null;
  pace_per_500m_ms: number | null; // High-precision pace in milliseconds
  // Rower/SkiErg specific fields
  level: number | null; // Difficulty level 1-10
  resistance: number | null; // Magnetic resistance 1-3
}

interface ExerciseFormData {
  exercise_id: string | null;
  exercise_name: string;
  sets: SetData[];
  default_unit?: string;
}

interface WorkoutExerciseFormProps {
  onAdd: (data: ExerciseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type MeasurementUnit = 'reps' | 'seconds' | 'meters' | 'calories' | 'cardio_machine';

const DEFAULT_SET: SetData = { 
  weight_kg: null, 
  reps: null, 
  rpe: null,
  time_seconds: null,
  time_ms: null,
  distance_meters: null,
  calories: null,
  watts: null,
  is_pr: false,
  heart_rate_zone: null,
  avg_heart_rate: null,
  max_heart_rate: null,
  pace_per_500m: null,
  pace_per_500m_ms: null,
  level: null,
  resistance: null,
};

// Detect if exercise is a rower or skierg type
function isRowerOrSkierg(exercise: Exercise | null): boolean {
  if (!exercise) return false;
  const name = (exercise.name_cs || exercise.name || '').toLowerCase();
  const category = (exercise.category || '').toLowerCase();
  return name.includes('veslo') || name.includes('rower') || name.includes('rowing') ||
         name.includes('skierg') || name.includes('skillup') || name.includes('skyark') ||
         category.includes('veslo') || category.includes('ski');
}

export function WorkoutExerciseForm({ onAdd, onCancel, isLoading }: WorkoutExerciseFormProps) {
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [sets, setSets] = useState<SetData[]>([{ ...DEFAULT_SET }]);
  
  // State for time/pace input as strings
  const [timeInputs, setTimeInputs] = useState<string[]>(['']);
  const [paceInputs, setPaceInputs] = useState<string[]>(['']);

  // Determine measurement type based on selected exercise
  const measurementUnit: MeasurementUnit = useMemo(() => {
    if (!selectedExercise) return 'reps';
    const unit = selectedExercise.default_unit as MeasurementUnit;
    return ['reps', 'seconds', 'meters', 'calories', 'cardio_machine'].includes(unit) ? unit : 'reps';
  }, [selectedExercise]);

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
    // Reset sets when changing exercise
    setSets([{ ...DEFAULT_SET }]);
    setTimeInputs(['']);
    setPaceInputs(['']);
  };

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { 
      ...lastSet,
      is_pr: false, // Never copy PR flag
    }]);
    setTimeInputs([...timeInputs, timeInputs[timeInputs.length - 1] || '']);
    setPaceInputs([...paceInputs, paceInputs[paceInputs.length - 1] || '']);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
      setTimeInputs(timeInputs.filter((_, i) => i !== index));
      setPaceInputs(paceInputs.filter((_, i) => i !== index));
    }
  };

  const handleSetChange = (index: number, field: keyof SetData, value: string | boolean) => {
    const newSets = [...sets];
    if (field === 'is_pr') {
      newSets[index] = { ...newSets[index], is_pr: value as boolean };
    } else {
      const numValue = value === '' ? null : parseFloat(value as string);
      newSets[index] = { ...newSets[index], [field]: numValue };
    }
    setSets(newSets);
  };

  const handleTimeInputChange = (index: number, value: string) => {
    const newTimeInputs = [...timeInputs];
    newTimeInputs[index] = value;
    setTimeInputs(newTimeInputs);
    
    // Parse and set both time_ms (precision) and time_seconds (legacy)
    const ms = parseTimeToMs(value);
    const newSets = [...sets];
    newSets[index] = { 
      ...newSets[index], 
      time_ms: ms,
      time_seconds: ms !== null ? msToSeconds(ms) : null 
    };
    setSets(newSets);
  };

  const handlePaceInputChange = (index: number, value: string) => {
    const newPaceInputs = [...paceInputs];
    newPaceInputs[index] = value;
    setPaceInputs(newPaceInputs);
    
    // Parse and set both pace_per_500m_ms (precision) and pace_per_500m (legacy)
    const ms = parsePaceToMs(value);
    const newSets = [...sets];
    newSets[index] = { 
      ...newSets[index], 
      pace_per_500m_ms: ms,
      pace_per_500m: ms !== null ? msToSeconds(ms) : null 
    };
    setSets(newSets);
  };

  const handleSubmit = () => {
    // Enforce exercise_id - no custom exercises allowed
    if (!selectedExercise) {
      return;
    }

    onAdd({
      exercise_id: selectedExercise.id,
      exercise_name: selectedExercise.name_cs || selectedExercise.name, // Snapshot for display
      sets: sets.filter(s => hasValidData(s)),
      default_unit: measurementUnit,
    });
  };

  const hasValidData = (set: SetData): boolean => {
    switch (measurementUnit) {
      case 'cardio_machine':
        return set.distance_meters !== null || set.time_seconds !== null || set.calories !== null;
      case 'seconds':
        return set.time_seconds !== null || set.weight_kg !== null;
      case 'meters':
        return set.distance_meters !== null || set.time_seconds !== null;
      case 'calories':
        return set.calories !== null || set.time_seconds !== null;
      default:
        return set.weight_kg !== null || set.reps !== null;
    }
  };

  // Only valid if exercise is selected from database (no custom exercises)
  const isValid = selectedExercise && sets.some(s => hasValidData(s));

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
                    <p className="text-xs text-muted-foreground mt-1">
                      Zkuste hledat jiným názvem nebo přidejte cvik do databáze
                    </p>
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

        {/* Note: Custom exercises no longer allowed - exercise_id is required */}
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
          {/* Header row - dynamic based on measurement type */}
          {measurementUnit === 'reps' && (
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Váha (kg)</span>
              <span>Opak.</span>
              <span>RPE</span>
              <span className="w-10 text-center">PR</span>
              <span className="w-8"></span>
            </div>
          )}
          {measurementUnit === 'seconds' && (
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Váha (kg)</span>
              <span>Čas (s)</span>
              <span>RPE</span>
              <span className="w-10 text-center">PR</span>
              <span className="w-8"></span>
            </div>
          )}
          {measurementUnit === 'meters' && (
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Vzdál. (m)</span>
              <span>Čas (s)</span>
              <span>RPE</span>
              <span className="w-10 text-center">PR</span>
              <span className="w-8"></span>
            </div>
          )}
          {measurementUnit === 'calories' && (
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted-foreground">
              <span className="w-8 text-center">#</span>
              <span>Kalorie</span>
              <span>Čas (s)</span>
              <span>Watt</span>
              <span className="w-10 text-center">PR</span>
              <span className="w-8"></span>
            </div>
          )}
          {measurementUnit === 'cardio_machine' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1 text-primary">
                <Heart className="w-3 h-3" />
                <span>Kardio trenažér</span>
              </div>
            </div>
          )}

          {sets.map((set, index) => (
            <div key={index}>
              {/* Cardio machine layout */}
              {measurementUnit === 'cardio_machine' ? (
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Série {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          checked={set.is_pr}
                          onCheckedChange={(checked) => handleSetChange(index, 'is_pr', !!checked)}
                          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <span className="text-xs text-muted-foreground">PR</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => handleRemoveSet(index)}
                        disabled={sets.length === 1}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Row 1: Distance, Time, Watts */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Vzdálenost (m)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.distance_meters ?? ''}
                        onChange={(e) => handleSetChange(index, 'distance_meters', e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Čas (m:ss)</Label>
                      <Input
                        placeholder="0:00"
                        value={timeInputs[index] || ''}
                        onChange={(e) => handleTimeInputChange(index, e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Watty</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.watts ?? ''}
                        onChange={(e) => handleSetChange(index, 'watts', e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Pace, HR Zone, Avg HR, Max HR */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo/500m</Label>
                      <Input
                        placeholder="0:00"
                        value={paceInputs[index] || ''}
                        onChange={(e) => handlePaceInputChange(index, e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">TZ (1-5)</Label>
                      <Select
                        value={set.heart_rate_zone?.toString() || ''}
                        onValueChange={(value) => handleSetChange(index, 'heart_rate_zone', value)}
                      >
                        <SelectTrigger className="bg-background border-border h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Avg HR</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.avg_heart_rate ?? ''}
                        onChange={(e) => handleSetChange(index, 'avg_heart_rate', e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max HR</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.max_heart_rate ?? ''}
                        onChange={(e) => handleSetChange(index, 'max_heart_rate', e.target.value)}
                        className="bg-background border-border h-9"
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Level and Resistance (for rower/skierg) */}
                  {isRowerOrSkierg(selectedExercise) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Obtížnost (1-10)</Label>
                        <Select
                          value={set.level?.toString() || ''}
                          onValueChange={(value) => handleSetChange(index, 'level', value)}
                        >
                          <SelectTrigger className="bg-background border-border h-9">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10].map(v => (
                              <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Magnet (1-3)</Label>
                        <Select
                          value={set.resistance?.toString() || ''}
                          onValueChange={(value) => handleSetChange(index, 'resistance', value)}
                        >
                          <SelectTrigger className="bg-background border-border h-9">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard set layout */
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-2 items-center">
                  <span className="w-8 text-center text-sm text-muted-foreground">
                    {index + 1}
                  </span>
                  
                  {/* Dynamic fields based on measurement type */}
                  {measurementUnit === 'reps' && (
                    <>
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
                    </>
                  )}
                  
                  {measurementUnit === 'seconds' && (
                    <>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="0"
                        value={set.weight_kg ?? ''}
                        onChange={(e) => handleSetChange(index, 'weight_kg', e.target.value)}
                        className="bg-secondary border-border h-9"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0:00"
                        value={timeInputs[index] || ''}
                        onChange={(e) => handleTimeInputChange(index, e.target.value)}
                        className="bg-secondary border-border h-9"
                        title="Formát: mm:ss nebo mm:ss.SS"
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
                    </>
                  )}
                  
                  {measurementUnit === 'meters' && (
                    <>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.distance_meters ?? ''}
                        onChange={(e) => handleSetChange(index, 'distance_meters', e.target.value)}
                        className="bg-secondary border-border h-9"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0:00"
                        value={timeInputs[index] || ''}
                        onChange={(e) => handleTimeInputChange(index, e.target.value)}
                        className="bg-secondary border-border h-9"
                        title="Formát: mm:ss nebo mm:ss.SS"
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
                    </>
                  )}
                  
                  {measurementUnit === 'calories' && (
                    <>
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.calories ?? ''}
                        onChange={(e) => handleSetChange(index, 'calories', e.target.value)}
                        className="bg-secondary border-border h-9"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0:00"
                        value={timeInputs[index] || ''}
                        onChange={(e) => handleTimeInputChange(index, e.target.value)}
                        className="bg-secondary border-border h-9"
                        title="Formát: mm:ss nebo mm:ss.SS"
                      />
                      <Input
                        type="number"
                        placeholder="-"
                        value={set.watts ?? ''}
                        onChange={(e) => handleSetChange(index, 'watts', e.target.value)}
                        className="bg-secondary border-border h-9"
                      />
                    </>
                  )}
                  
                  {/* PR Checkbox */}
                  <div className="w-10 flex justify-center">
                    <Checkbox
                      checked={set.is_pr}
                      onCheckedChange={(checked) => handleSetChange(index, 'is_pr', !!checked)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                  </div>
                  
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
              )}
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
