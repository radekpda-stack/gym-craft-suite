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
  WorkoutFormat,
} from '@/hooks/useTrainingTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  CircuitFormatSelector,
  CircuitParametersForm,
  CircuitExerciseItem,
  CircuitPreview,
  CircuitParameters,
  CircuitExercise,
  WorkoutFormat as CircuitWorkoutFormat,
} from './circuit';

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
  // Determine initial tab based on template's workout_format
  const isCircuitFormat = template?.workout_format && template.workout_format !== 'standard';
  const [activeTab, setActiveTab] = useState<'standard' | 'circuit'>(isCircuitFormat ? 'circuit' : 'standard');
  
  // Common fields
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || '');
  const [estimatedDuration, setEstimatedDuration] = useState(
    template?.estimated_duration?.toString() || ''
  );
  
  // Standard training fields
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  
  // Circuit training fields
  const [circuitFormat, setCircuitFormat] = useState<CircuitWorkoutFormat>(
    (template?.workout_format && template.workout_format !== 'standard' 
      ? template.workout_format 
      : 'amrap') as CircuitWorkoutFormat
  );
  const [circuitParams, setCircuitParams] = useState<CircuitParameters>({
    timeCap: template?.time_cap_seconds ? Math.floor(template.time_cap_seconds / 60) : undefined,
    rounds: template?.rounds ?? undefined,
    workInterval: template?.work_interval_seconds ?? undefined,
    restInterval: template?.rest_interval_seconds ?? undefined,
  });
  const [circuitExercises, setCircuitExercises] = useState<CircuitExercise[]>([]);
  const [showCircuitExercisePicker, setShowCircuitExercisePicker] = useState(false);
  
  // Dialog states
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

  // Load standard exercises
  useEffect(() => {
    if (template?.exercises && !isCircuitFormat) {
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
  }, [template, isCircuitFormat]);

  // Load circuit exercises
  useEffect(() => {
    if (template?.exercises && isCircuitFormat) {
      setCircuitExercises(
        template.exercises.map((ex, idx) => ({
          tempId: ex.id || `temp-${idx}`,
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercise_name,
          reps: ex.reps_min || ex.reps_max,
          time_seconds: ex.time_seconds,
          distance_meters: null,
          weight_kg: null,
          notes: ex.notes,
          sort_order: ex.sort_order,
        }))
      );
    }
  }, [template, isCircuitFormat]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      if (activeTab === 'standard') {
        setExercises((items) => {
          const oldIndex = items.findIndex((i) => i.tempId === active.id);
          const newIndex = items.findIndex((i) => i.tempId === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      } else {
        setCircuitExercises((items) => {
          const oldIndex = items.findIndex((i) => i.tempId === active.id);
          const newIndex = items.findIndex((i) => i.tempId === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
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

  const handleAddCircuitExercise = (exercise: { id: string; name: string }) => {
    setCircuitExercises((prev) => [
      ...prev,
      {
        tempId: `temp-${Date.now()}`,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        reps: 10,
        time_seconds: null,
        distance_meters: null,
        weight_kg: null,
        notes: null,
        sort_order: prev.length,
      },
    ]);
    setShowCircuitExercisePicker(false);
  };

  const handleUpdateExercise = (tempId: string, updates: Partial<TemplateExercise>) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.tempId === tempId ? { ...ex, ...updates } : ex))
    );
  };

  const handleUpdateCircuitExercise = (tempId: string, updates: Partial<CircuitExercise>) => {
    setCircuitExercises((prev) =>
      prev.map((ex) => (ex.tempId === tempId ? { ...ex, ...updates } : ex))
    );
  };

  const handleRemoveExercise = (tempId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
  };

  const handleRemoveCircuitExercise = (tempId: string) => {
    setCircuitExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
  };

  const buildInput = (): CreateTemplateInput => {
    const isCircuit = activeTab === 'circuit';
    
    const baseInput: CreateTemplateInput = {
      name,
      description: description || undefined,
      category: category || undefined,
      estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      workout_format: isCircuit ? circuitFormat : 'standard',
      time_cap_seconds: isCircuit && circuitParams.timeCap ? circuitParams.timeCap * 60 : undefined,
      rounds: isCircuit ? circuitParams.rounds : undefined,
      work_interval_seconds: isCircuit ? circuitParams.workInterval : undefined,
      rest_interval_seconds: isCircuit ? circuitParams.restInterval : undefined,
    };

    if (isCircuit) {
      baseInput.exercises = circuitExercises.map((ex, idx) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        block_type: 'circuit',
        sets: null,
        reps_min: ex.reps,
        reps_max: ex.reps,
        time_seconds: ex.time_seconds,
        rest_seconds: null,
        tempo: null,
        rpe: null,
        rir: null,
        notes: ex.notes,
        sort_order: idx,
      }));
    } else {
      baseInput.exercises = exercises.map((ex, idx) => ({
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
      }));
    }

    return baseInput;
  };

  const handleSave = async () => {
    const input = buildInput();

    if (template?.id) {
      await updateTemplate.mutateAsync({ id: template.id, ...input });
    } else {
      await createTemplate.mutateAsync(input);
    }

    onSaved?.();
    onBack();
  };

  const handleSaveAndAssign = async () => {
    const input = buildInput();

    let resultTemplate: TrainingTemplate;
    
    if (template?.id) {
      const result = await updateTemplate.mutateAsync({ id: template.id, ...input });
      resultTemplate = result;
    } else {
      const result = await createTemplate.mutateAsync(input);
      resultTemplate = result;
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'standard' | 'circuit')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="standard">Klasický trénink</TabsTrigger>
          <TabsTrigger value="circuit">Kruhový trénink</TabsTrigger>
        </TabsList>

        {/* Standard Training Tab */}
        <TabsContent value="standard" className="mt-6">
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
        </TabsContent>

        {/* Circuit Training Tab */}
        <TabsContent value="circuit" className="mt-6">
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informace</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="circuit-name">Název *</Label>
                    <Input
                      id="circuit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Např. Cindy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="circuit-description">Popis</Label>
                    <Input
                      id="circuit-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Volitelný popis..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="circuit-category">Kategorie</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="circuit-category">
                        <SelectValue placeholder="Vyberte" />
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
                    <Label htmlFor="circuit-duration">Délka (min)</Label>
                    <Input
                      id="circuit-duration"
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      placeholder="20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Format Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Formát tréninku</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CircuitFormatSelector value={circuitFormat} onChange={setCircuitFormat} />
                <CircuitParametersForm
                  format={circuitFormat}
                  parameters={circuitParams}
                  onChange={setCircuitParams}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Circuit Exercises */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cviky v kruhu ({circuitExercises.length})</CardTitle>
                  <Button onClick={() => setShowCircuitExercisePicker(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Přidat cvik
                  </Button>
                </CardHeader>
                <CardContent>
                  {circuitExercises.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Zatím žádné cviky</p>
                      <p className="text-sm">Přidejte cviky do kruhu</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={circuitExercises.map((e) => e.tempId)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {circuitExercises.map((exercise, index) => (
                            <CircuitExerciseItem
                              key={exercise.tempId}
                              id={exercise.tempId}
                              exercise={exercise}
                              index={index}
                              onUpdate={(updates) => handleUpdateCircuitExercise(exercise.tempId, updates)}
                              onRemove={() => handleRemoveCircuitExercise(exercise.tempId)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <div className="lg:col-span-1">
                <CircuitPreview
                  name={name}
                  format={circuitFormat}
                  parameters={circuitParams}
                  exercises={circuitExercises}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Exercise Picker Dialogs */}
      <ExercisePickerDialog
        open={showExercisePicker}
        onOpenChange={setShowExercisePicker}
        onSelect={handleAddExercise}
      />
      
      <ExercisePickerDialog
        open={showCircuitExercisePicker}
        onOpenChange={setShowCircuitExercisePicker}
        onSelect={handleAddCircuitExercise}
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
