import { cn } from '@/lib/utils';
import { Dumbbell, Heart, Zap, Move, Coffee, Shuffle } from 'lucide-react';

export const WORKOUT_TYPES = [
  { value: 'strength', label: 'Silový', icon: Dumbbell, color: 'text-blue-500' },
  { value: 'cardio', label: 'Kardio', icon: Heart, color: 'text-red-500' },
  { value: 'hiit', label: 'HIIT', icon: Zap, color: 'text-orange-500' },
  { value: 'mobility', label: 'Mobilita', icon: Move, color: 'text-green-500' },
  { value: 'recovery', label: 'Regenerace', icon: Coffee, color: 'text-purple-500' },
  { value: 'mixed', label: 'Smíšený', icon: Shuffle, color: 'text-primary' },
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number]['value'];

interface WorkoutTypeSelectorProps {
  value: string | null;
  onChange: (value: WorkoutType) => void;
}

export function WorkoutTypeSelector({ value, onChange }: WorkoutTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {WORKOUT_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
              isSelected 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Icon className={cn("w-5 h-5", isSelected ? type.color : "text-muted-foreground")} />
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
