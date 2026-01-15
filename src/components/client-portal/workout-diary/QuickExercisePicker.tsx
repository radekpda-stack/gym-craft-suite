import { usePopularStrengthExercises } from '@/hooks/usePopularExercises';
import { cn } from '@/lib/utils';
import { Dumbbell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickExercisePickerProps {
  onSelect: (exercise: { id: string; name: string; name_cs: string | null }) => void;
  selectedIds?: string[];
}

export function QuickExercisePicker({ onSelect, selectedIds = [] }: QuickExercisePickerProps) {
  const { data: exercises, isLoading } = usePopularStrengthExercises(8);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Rychlý výběr oblíbených cviků:</p>
      <div className="grid grid-cols-2 gap-2">
        {exercises.map((exercise, idx) => {
          const isSelected = selectedIds.includes(exercise.id);
          const displayName = exercise.name_cs || exercise.name;
          // Shorten long names
          const shortName = displayName.length > 20 
            ? displayName.substring(0, 18) + '...' 
            : displayName;
          
          return (
            <motion.button
              key={exercise.id}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => onSelect({
                id: exercise.id,
                name: exercise.name,
                name_cs: exercise.name_cs,
              })}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg text-left transition-all text-sm",
                "border hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? "bg-warning/20 border-warning/50 text-warning-foreground"
                  : "bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/20"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                isSelected ? "bg-warning/30" : "bg-warning/10"
              )}>
                <Dumbbell className="w-3.5 h-3.5 text-warning" />
              </div>
              <span className="font-medium truncate" title={displayName}>
                {shortName}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
