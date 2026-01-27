import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ParsedExerciseV2 } from '@/hooks/useRxWorkoutParserV2';
import { Check, ChevronsUpDown, Plus, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExerciseMapping {
  raw_name: string;
  action: 'map' | 'create';
  selected_id?: string;
  new_name?: string;
  new_category?: string;
}

interface RxExerciseMappingStepProps {
  unmappedExercises: ParsedExerciseV2[];
  exercisesList: Array<{ id: string; name: string; name_cs: string | null; category: string }>;
  onMappingsChange: (mappings: ExerciseMapping[]) => void;
  mappings: ExerciseMapping[];
}

const CATEGORIES = [
  'Kardio',
  'Silový',
  'Plyometrie',
  'Mobilita',
  'Core',
  'Funkční',
  'Ostatní',
];

export function RxExerciseMappingStep({
  unmappedExercises,
  exercisesList,
  onMappingsChange,
  mappings,
}: RxExerciseMappingStepProps) {
  // Initialize mappings if empty
  useEffect(() => {
    if (mappings.length === 0 && unmappedExercises.length > 0) {
      const initialMappings = unmappedExercises.map(ex => ({
        raw_name: ex.raw_name,
        action: 'create' as const,
        new_name: ex.exercise_name,
        new_category: 'Ostatní',
      }));
      onMappingsChange(initialMappings);
    }
  }, [unmappedExercises, mappings.length, onMappingsChange]);

  const updateMapping = (rawName: string, updates: Partial<ExerciseMapping>) => {
    const newMappings = mappings.map(m =>
      m.raw_name === rawName ? { ...m, ...updates } : m
    );
    onMappingsChange(newMappings);
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {unmappedExercises.map((exercise) => {
          const mapping = mappings.find(m => m.raw_name === exercise.raw_name);
          if (!mapping) return null;

          return (
            <div
              key={exercise.raw_name}
              className="border rounded-lg p-4 space-y-4"
            >
              {/* Exercise name header */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {exercise.raw_name}
                </Badge>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{exercise.exercise_name}</span>
              </div>

              {/* Suggested matches */}
              {exercise.suggested_matches && exercise.suggested_matches.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Návrhy: {exercise.suggested_matches.slice(0, 3).map((m, i) => (
                    <button
                      key={m.id}
                      className="text-primary hover:underline ml-1"
                      onClick={() => updateMapping(exercise.raw_name, {
                        action: 'map',
                        selected_id: m.id,
                      })}
                    >
                      {m.name} ({Math.round(m.similarity * 100)}%)
                      {i < Math.min(2, exercise.suggested_matches!.length - 1) && ','}
                    </button>
                  ))}
                </div>
              )}

              {/* Action selection */}
              <RadioGroup
                value={mapping.action}
                onValueChange={(value: 'map' | 'create') =>
                  updateMapping(exercise.raw_name, { action: value })
                }
              >
                {/* Map to existing */}
                <div className="flex items-start space-x-3 p-3 rounded-md border bg-secondary/30">
                  <RadioGroupItem value="map" id={`map-${exercise.raw_name}`} />
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor={`map-${exercise.raw_name}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Link2 className="h-4 w-4" />
                      Přiřadit k existujícímu cviku
                    </Label>
                    {mapping.action === 'map' && (
                      <ExerciseCombobox
                        exercises={exercisesList}
                        value={mapping.selected_id}
                        onValueChange={(id) =>
                          updateMapping(exercise.raw_name, { selected_id: id })
                        }
                      />
                    )}
                  </div>
                </div>

                {/* Create new */}
                <div className="flex items-start space-x-3 p-3 rounded-md border bg-secondary/30">
                  <RadioGroupItem value="create" id={`create-${exercise.raw_name}`} />
                  <div className="flex-1 space-y-3">
                    <Label
                      htmlFor={`create-${exercise.raw_name}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Vytvořit nový cvik
                    </Label>
                    {mapping.action === 'create' && (
                      <div className="grid gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Název
                          </Label>
                          <Input
                            value={mapping.new_name || exercise.exercise_name}
                            onChange={(e) =>
                              updateMapping(exercise.raw_name, {
                                new_name: e.target.value,
                              })
                            }
                            placeholder="Název cviku"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Kategorie
                          </Label>
                          <Select
                            value={mapping.new_category || 'Ostatní'}
                            onValueChange={(value) =>
                              updateMapping(exercise.raw_name, {
                                new_category: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// Combobox for exercise selection
function ExerciseCombobox({
  exercises,
  value,
  onValueChange,
}: {
  exercises: Array<{ id: string; name: string; name_cs: string | null; category: string }>;
  value?: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedExercise = exercises.find((ex) => ex.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedExercise
            ? selectedExercise.name_cs || selectedExercise.name
            : 'Vybrat cvik...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Hledat cvik..." />
          <CommandList>
            <CommandEmpty>Žádný cvik nenalezen</CommandEmpty>
            <CommandGroup>
              {exercises.slice(0, 50).map((ex) => (
                <CommandItem
                  key={ex.id}
                  value={`${ex.name_cs || ex.name} ${ex.name}`}
                  onSelect={() => {
                    onValueChange(ex.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === ex.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div>
                    <div>{ex.name_cs || ex.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ex.category}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { ExerciseMapping };
