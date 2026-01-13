import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CircuitExercise {
  tempId: string;
  exercise_id: string | null;
  exercise_name: string;
  reps?: number | null;
  time_seconds?: number | null;
  distance_meters?: number | null;
  height_cm?: number | null; // For height-based jumps
  weight_kg?: number | null;
  notes?: string | null;
  sort_order: number;
}

interface CircuitExerciseItemProps {
  id: string;
  exercise: CircuitExercise;
  index: number;
  onUpdate: (updates: Partial<CircuitExercise>) => void;
  onRemove: () => void;
}

export function CircuitExerciseItem({
  id,
  exercise,
  index,
  onUpdate,
  onRemove,
}: CircuitExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary/50 opacity-90'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-2"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Exercise content */}
          <div className="flex-1 space-y-3">
            {/* Exercise name and order */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground">
                {index + 1}.
              </span>
              <span className="font-semibold">{exercise.exercise_name}</span>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Opakování</Label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.reps ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      reps: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="10"
                  className="h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Čas (s)</Label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.time_seconds ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      time_seconds: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="30"
                  className="h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Vzdálenost (m)</Label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.distance_meters ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      distance_meters: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="200"
                  className="h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Výška (cm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={exercise.height_cm ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      height_cm: e.target.value === '' ? null : parseInt(e.target.value),
                    })
                  }
                  placeholder="45"
                  className="h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Váha (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={exercise.weight_kg ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      weight_kg: e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  placeholder="24"
                  className="h-8"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Poznámky</Label>
              <Input
                value={exercise.notes ?? ''}
                onChange={(e) => onUpdate({ notes: e.target.value || null })}
                placeholder="Volitelné poznámky..."
                className="h-8"
              />
            </div>
          </div>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
