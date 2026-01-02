import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  TrainingTemplate,
  TrainingTemplateExercise,
  useCreateTrainingTemplate,
  useUpdateTrainingTemplate,
  CreateTemplateInput,
} from '@/hooks/useTrainingTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Loader2, UserPlus } from 'lucide-react';
import { SortableExerciseItem } from './SortableExerciseItem';
import { ExercisePickerDialog } from './ExercisePickerDialog';
import { AssignTemplateToClientDialog } from './AssignTemplateToClientDialog';

interface TemplateEditorProps {
  template?: TrainingTemplate | null;
  onBack: () => void;
  onSaved?: () => void;
}

type TemplateExercise = Omit<TrainingTemplateExercise, 'id' | 'template_id' | 'created_at'> & { 
  tempId: string;
};

const CATEGORIES = [
  { value: 'strength', label: 'Síla' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'conditioning', label: 'Kondice' },
  { value: 'rehab', label: 'Rehabilitace' },
  { value: 'mobility', label: 'Mobilita' },
];

const BLOCK_TYPES = [
  { value: 'prep', label: 'Příprava' },
  { value: 'primary', label: 'Hlavní' },
  { value: 'secondary', label: 'Sekundární' },
  { value: 'accessory', label: 'Doplňkový' },
  { value: 'core', label: 'Core' },
  { value: 'conditioning', label: 'Kondice' },
  { value: 'cooldown', label: 'Cooldown' },
];

export function TemplateEditor({ template, onBack, onSaved }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    template?.estimated_duration?.toString() || ''
  );
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [savedTemplate, setSavedTemplate] = useState<TrainingTemplate | null>(null);

  const createTemplate = useCreateTrainingTemplate();
  const updateTemplate = useUpdateTrainingTemplate();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (template?.exercises) {
      setExercises(
        template.exercises.map((ex, idx) => ({
          tempId: ex.id || `temp-${idx}`,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          block_type: ex.block_type,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rpe: ex.rpe,
          rir: ex.rir,
          notes: ex.notes,
          sort_order: ex.sort_order,
        }))
      );
    }
  }, [template]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((i) => i.tempId === active.id);
        const newIndex = items.findIndex((i) => i.tempId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddExercise = (exercise: { id: string; name: string }) => {
    setExercises((prev) => [
      ...prev,
      {
        tempId: `temp-${Date.now()}`,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        block_type: 'primary',
        sets: 3,
        reps_min: 8,
        reps_max: 12,
        time_seconds: null,
        rest_seconds: 90,
        tempo: null,
        rpe: null,
        rir: null,
        notes: null,
        sort_order: prev.length,
      },
    ]);
    setShowExercisePicker(false);
  };

  const handleUpdateExercise = (tempId: string, updates: Partial<TemplateExercise>) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.tempId === tempId ? { ...ex, ...updates } : ex))
    );
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
  };

  const handleSave = async () => {
    const input: CreateTemplateInput = {
      name,
      description: description || undefined,
      category: category || undefined,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      exercises: exercises.map((ex, idx) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        block_type: ex.block_type,
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        time_seconds: ex.time_seconds,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo,
        rpe: ex.rpe,
        rir: ex.rir,
        notes: ex.notes,
        sort_order: idx,
      })),
    };

    let resultTemplate: TrainingTemplate;
    
    if (template?.id) {
      await updateTemplate.mutateAsync({ id: template.id, ...input });
      resultTemplate = { ...template, ...input, exercises: template.exercises };
    } else {
      const result = await createTemplate.mutateAsync(input);
      resultTemplate = {
        id: result.id,
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        estimated_duration: input.estimated_duration || null,
        tags: null,
        is_public: false,
        user_id: result.user_id,
        created_at: result.created_at,
        updated_at: result.updated_at,
        exercises: exercises.map((ex, idx) => ({
          id: `temp-${idx}`,
          template_id: result.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          block_type: ex.block_type,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rpe: ex.rpe,
          rir: ex.rir,
          notes: ex.notes,
          sort_order: idx,
          created_at: new Date().toISOString(),
        })),
      };
    }

    setSavedTemplate(resultTemplate);
    onSaved?.();
    onBack();
  };

  const handleSaveAndAssign = async () => {
    const input: CreateTemplateInput = {
      name,
      description: description || undefined,
      category: category || undefined,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      exercises: exercises.map((ex, idx) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        block_type: ex.block_type,
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        time_seconds: ex.time_seconds,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo,
        rpe: ex.rpe,
        rir: ex.rir,
        notes: ex.notes,
        sort_order: idx,
      })),
    };

    let resultTemplate: TrainingTemplate;
    
    if (template?.id) {
      await updateTemplate.mutateAsync({ id: template.id, ...input });
      resultTemplate = { ...template, ...input, exercises: template.exercises };
    } else {
      const result = await createTemplate.mutateAsync(input);
      resultTemplate = {
        id: result.id,
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        estimated_duration: input.estimated_duration || null,
        tags: null,
        is_public: false,
        user_id: result.user_id,
        created_at: result.created_at,
        updated_at: result.updated_at,
        exercises: exercises.map((ex, idx) => ({
          id: `temp-${idx}`,
          template_id: result.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          block_type: ex.block_type,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          time_seconds: ex.time_seconds,
          rest_seconds: ex.rest_seconds,
          tempo: ex.tempo,
          rpe: ex.rpe,
          rir: ex.rir,
          notes: ex.notes,
          sort_order: idx,
          created_at: new Date().toISOString(),
        })),
      };
    }

    setSavedTemplate(resultTemplate);
    setShowAssignDialog(true);
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {template ? 'Upravit šablonu' : 'Nová šablona'}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSaveAndAssign} 
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Uložit a přiřadit
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Template Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Informace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Název *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Např. Full Body A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Popis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Volitelný popis šablony..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte kategorii" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Odhadovaná délka (min)</Label>
              <Input
                id="duration"
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="45"
              />
            </div>
          </CardContent>
        </Card>

        {/* Exercises */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cviky ({exercises.length})</CardTitle>
            <Button onClick={() => setShowExercisePicker(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Přidat cvik
            </Button>
          </CardHeader>
          <CardContent>
            {exercises.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Zatím žádné cviky</p>
                <p className="text-sm">Přidejte cviky pomocí tlačítka výše</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={exercises.map((e) => e.tempId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {exercises.map((exercise, index) => (
                      <SortableExerciseItem
                        key={exercise.tempId}
                        id={exercise.tempId}
                        exercise={exercise}
                        index={index}
                        blockTypes={BLOCK_TYPES}
                        onUpdate={(updates) => handleUpdateExercise(exercise.tempId, updates)}
                        onRemove={() => handleRemoveExercise(exercise.tempId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exercise Picker Dialog */}
      <ExercisePickerDialog
        open={showExercisePicker}
        onOpenChange={setShowExercisePicker}
        onSelect={handleAddExercise}
      />

      {/* Assign Dialog after save */}
      {savedTemplate && (
        <AssignTemplateToClientDialog
          open={showAssignDialog}
          onOpenChange={(open) => {
            setShowAssignDialog(open);
            if (!open) {
              onBack();
            }
          }}
          template={savedTemplate}
        />
      )}
    </div>
  );
}
