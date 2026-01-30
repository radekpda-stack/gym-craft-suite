import { cn } from '@/lib/utils';
import { Dumbbell, Heart, Zap, Move, Coffee, Shuffle, Footprints, Activity, Ship, Mountain, Circle, Bike, PersonStanding, Waves } from 'lucide-react';

export const WORKOUT_TYPES = [
  { value: 'strength', label: 'Silový', icon: Dumbbell, color: 'text-accent' },
  { value: 'hiit', label: 'HIIT', icon: Zap, color: 'text-warning' },
  { value: 'cardio', label: 'Kardio', icon: Heart, color: 'text-destructive' },
  { value: 'running', label: 'Běh', icon: Footprints, color: 'text-success' },
  { value: 'functional', label: 'Funkční', icon: Activity, color: 'text-accent' },
  { value: 'mobility', label: 'Mobilita', icon: Move, color: 'text-success' },
  { value: 'regeneration', label: 'Regenerace', icon: Coffee, color: 'text-primary' },
  // Machine types
  { value: 'rowing', label: 'Veslo', icon: Ship, color: 'text-accent' },
  { value: 'skierg', label: 'SkiErg', icon: Mountain, color: 'text-accent' },
  { value: 'treadmill_motor', label: 'Pás motor', icon: Zap, color: 'text-success' },
  { value: 'treadmill_curved', label: 'Pás curved', icon: Activity, color: 'text-success' },
  { value: 'jumprope', label: 'Švihadlo', icon: Circle, color: 'text-warning' },
  { value: 'cycling', label: 'Kolo', icon: Bike, color: 'text-accent' },
  { value: 'walk', label: 'Chůze', icon: PersonStanding, color: 'text-accent' },
  { value: 'swimming', label: 'Plavání', icon: Waves, color: 'text-accent' },
  { value: 'other', label: 'Jiný', icon: Shuffle, color: 'text-muted-foreground' },
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number]['value'];

interface WorkoutTypeSelectorProps {
  value: string | null;
  onChange: (value: WorkoutType) => void;
}

export function WorkoutTypeSelector({ value, onChange }: WorkoutTypeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {WORKOUT_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
              isSelected 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Icon className={cn("w-4 h-4", isSelected ? type.color : "text-muted-foreground")} />
            <span className={cn("text-xs font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>
              {type.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function getWorkoutTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Trénink';
  return WORKOUT_TYPES.find(t => t.value === type)?.label || type;
}

export function getWorkoutTypeIcon(type: string | null | undefined) {
  if (!type) return Dumbbell;
  return WORKOUT_TYPES.find(t => t.value === type)?.icon || Dumbbell;
}

export function getWorkoutTypeColor(type: string | null | undefined): string {
  if (!type) return 'text-primary';
  return WORKOUT_TYPES.find(t => t.value === type)?.color || 'text-primary';
}
