import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExerciseData {
  exercise_name: string;
  block_type: string;
  sets: number | null;
  reps_min: number | null;
  reps_max: number | null;
  time_seconds: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  rpe: number | null;
  rir: number | null;
  notes: string | null;
}

interface SortableExerciseItemProps {
  id: string;
  exercise: ExerciseData;
  index: number;
  blockTypes: { value: string; label: string }[];
  onUpdate: (updates: Partial<ExerciseData>) => void;
  onRemove: () => void;
}

export function SortableExerciseItem({
  id,
  exercise,
  index,
  blockTypes,
  onUpdate,
  onRemove,
}: SortableExerciseItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50'
      )}
    >
      <Card className="border-l-4 border-l-primary/50">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <button
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="w-5 h-5" />
              </button>
              
              <span className="text-sm font-medium text-muted-foreground w-6">
                {index + 1}.
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{exercise.exercise_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{blockTypes.find(b => b.value === exercise.block_type)?.label}</span>
                  <span>•</span>
                  <span>
                    {exercise.sets}x{exercise.reps_min}
                    {exercise.reps_max && exercise.reps_max !== exercise.reps_min 
                      ? `-${exercise.reps_max}` 
                      : ''}
                  </span>
                  {exercise.rest_seconds && (
                    <>
                      <span>•</span>
                      <span>{exercise.rest_seconds}s odpočinek</span>
                    </>
                  )}
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <CollapsibleContent>
              <div className="grid gap-3 mt-4 pt-4 border-t sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Typ bloku</label>
                  <Select
                    value={exercise.block_type}
                    onValueChange={(value) => onUpdate({ block_type: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {blockTypes.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {bt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Série</label>
                  <Input
                    type="number"
                    className="h-8"
                    value={exercise.sets || ''}
                    onChange={(e) => onUpdate({ sets: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Opakování min</label>
                  <Input
                    type="number"
                    className="h-8"
                    value={exercise.reps_min || ''}
                    onChange={(e) => onUpdate({ reps_min: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Opakování max</label>
                  <Input
                    type="number"
                    className="h-8"
                    value={exercise.reps_max || ''}
                    onChange={(e) => onUpdate({ reps_max: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Čas (s)</label>
                  <Input
                    type="number"
                    className="h-8"
                    value={exercise.time_seconds || ''}
                    onChange={(e) => onUpdate({ time_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Odpočinek (s)</label>
                  <Input
                    type="number"
                    className="h-8"
                    value={exercise.rest_seconds || ''}
                    onChange={(e) => onUpdate({ rest_seconds: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tempo</label>
                  <Input
                    className="h-8"
                    placeholder="3-0-1"
                    value={exercise.tempo || ''}
                    onChange={(e) => onUpdate({ tempo: e.target.value || null })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">RPE / RIR</label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      className="h-8 w-1/2"
                      placeholder="RPE"
                      value={exercise.rpe || ''}
                      onChange={(e) => onUpdate({ rpe: e.target.value ? parseInt(e.target.value) : null })}
                    />
                    <Input
                      type="number"
                      className="h-8 w-1/2"
                      placeholder="RIR"
                      value={exercise.rir || ''}
                      onChange={(e) => onUpdate({ rir: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs text-muted-foreground">Poznámky</label>
                  <Input
                    className="h-8"
                    placeholder="Poznámky k cviku..."
                    value={exercise.notes || ''}
                    onChange={(e) => onUpdate({ notes: e.target.value || null })}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
    </div>
  );
}
