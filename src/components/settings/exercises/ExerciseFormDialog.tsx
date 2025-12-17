import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useExercises,
  useExerciseMuscles,
  useExerciseEquipment,
  useExerciseRelations,
  Exercise,
  MOVEMENT_PATTERNS,
  DIFFICULTIES,
  DEFAULT_UNITS,
  MUSCLES,
  MUSCLE_ROLES,
  EQUIPMENT_OPTIONS,
  RELATION_TYPES,
  MovementPattern,
  Difficulty,
  DefaultUnit,
  Muscle,
  MuscleRole,
  Equipment,
  RelationType,
} from '@/hooks/useExercises';
import {
  MOVEMENT_PATTERN_LABELS,
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
} from '../ExercisesManagement';

const MUSCLE_LABELS: Record<string, string> = {
  glutes: 'Hýždě',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstringy',
  adductors: 'Adduktory',
  abductors: 'Abduktory',
  calves: 'Lýtka',
  tibialis_anterior: 'Přední holenní',
  erectors: 'Vzpřimovače páteře',
  lats: 'Lats',
  upper_back: 'Horní záda',
  traps_upper: 'Trapézy',
  rear_delts: 'Zadní delty',
  delts: 'Ramena',
  chest: 'Hrudník',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Předloktí',
  core: 'Core',
  obliques: 'Šikmé břišní',
  hip_flexors: 'Flexory kyčle',
  rotator_cuff: 'Rotátorová manžeta',
  serratus: 'Serratus',
  neck: 'Krk',
};

const ROLE_LABELS: Record<string, string> = {
  primary: 'Primární',
  secondary: 'Sekundární',
  stabilizer: 'Stabilizátor',
};

const RELATION_LABELS: Record<string, string> = {
  variant: 'Varianta',
  regression: 'Regrese',
  progression: 'Progrese',
  alternative: 'Alternativa',
  prep: 'Příprava',
};

const DEFAULT_UNIT_LABELS: Record<string, string> = {
  reps: 'Opakování',
  seconds: 'Sekundy',
  meters: 'Metry',
  calories: 'Kalorie',
};

interface Props {
  exercise: Exercise | null;
  onClose: () => void;
}

export function ExerciseFormDialog({ exercise, onClose }: Props) {
  const { exercises, createExercise, updateExercise, deleteExercise } = useExercises();
  const { muscles, addMuscle, removeMuscle } = useExerciseMuscles(exercise?.id || null);
  const { equipment, addEquipment, removeEquipment } = useExerciseEquipment(exercise?.id || null);
  const { relations, addRelation, removeRelation } = useExerciseRelations(exercise?.id || null);

  const [formData, setFormData] = useState({
    name_cs: '',
    name_en: '',
    category: 'Dolní tělo',
    subcategory: '',
    description_cs: '',
    description_en: '',
    instructions_cs: '',
    instructions_en: '',
    movement_pattern: '' as MovementPattern | '',
    difficulty: '' as Difficulty | '',
    default_unit: 'reps' as DefaultUnit,
    is_unilateral: false,
    is_bodyweight: false,
    is_time_based: false,
    video_url: '',
    image_url: '',
  });

  const [newMuscle, setNewMuscle] = useState<{ muscle: Muscle | ''; role: MuscleRole }>({
    muscle: '',
    role: 'primary',
  });
  const [newEquipment, setNewEquipment] = useState<Equipment | ''>('');
  const [newRelation, setNewRelation] = useState<{
    relatedId: string;
    type: RelationType;
  }>({ relatedId: '', type: 'variant' });

  useEffect(() => {
    if (exercise) {
      setFormData({
        name_cs: exercise.name_cs || exercise.name || '',
        name_en: exercise.name_en || '',
        category: exercise.category || 'Dolní tělo',
        subcategory: exercise.subcategory || '',
        description_cs: exercise.description_cs || exercise.description || '',
        description_en: exercise.description_en || '',
        instructions_cs: exercise.instructions_cs || '',
        instructions_en: exercise.instructions_en || '',
        movement_pattern: exercise.movement_pattern || '',
        difficulty: exercise.difficulty || '',
        default_unit: exercise.default_unit || 'reps',
        is_unilateral: exercise.is_unilateral || false,
        is_bodyweight: exercise.is_bodyweight || false,
        is_time_based: exercise.is_time_based || false,
        video_url: exercise.video_url || '',
        image_url: exercise.image_url || '',
      });
    }
  }, [exercise]);

  const handleSubmit = () => {
    const data = {
      name_cs: formData.name_cs,
      name_en: formData.name_en || null,
      category: formData.category,
      subcategory: formData.subcategory || null,
      description_cs: formData.description_cs || null,
      description_en: formData.description_en || null,
      instructions_cs: formData.instructions_cs || null,
      instructions_en: formData.instructions_en || null,
      movement_pattern: formData.movement_pattern || null,
      difficulty: formData.difficulty || null,
      default_unit: formData.default_unit,
      is_unilateral: formData.is_unilateral,
      is_bodyweight: formData.is_bodyweight,
      is_time_based: formData.is_time_based,
      video_url: formData.video_url || null,
      image_url: formData.image_url || null,
      // Keep legacy fields in sync
      muscle_groups: [] as string[],
      secondary_muscle_groups: [] as string[],
      equipment: [] as string[],
      training_type: [] as string[],
    };

    if (exercise) {
      updateExercise.mutate({ id: exercise.id, ...data });
    } else {
      createExercise.mutate(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (exercise) {
      deleteExercise.mutate(exercise.id);
      onClose();
    }
  };

  const handleAddMuscle = () => {
    if (exercise && newMuscle.muscle) {
      addMuscle.mutate({
        exerciseId: exercise.id,
        muscle: newMuscle.muscle,
        role: newMuscle.role,
      });
      setNewMuscle({ muscle: '', role: 'primary' });
    }
  };

  const handleAddEquipment = () => {
    if (exercise && newEquipment) {
      addEquipment.mutate({
        exerciseId: exercise.id,
        equipment: newEquipment,
      });
      setNewEquipment('');
    }
  };

  const handleAddRelation = () => {
    if (exercise && newRelation.relatedId) {
      addRelation.mutate({
        exercise_id: exercise.id,
        related_exercise_id: newRelation.relatedId,
        relation_type: newRelation.type,
        note_cs: null,
        note_en: null,
      });
      setNewRelation({ relatedId: '', type: 'variant' });
    }
  };

  const otherExercises = exercises.filter(e => e.id !== exercise?.id && !e.is_archived);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{exercise ? 'Upravit cvik' : 'Nový cvik'}</DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Základní</TabsTrigger>
          <TabsTrigger value="muscles" disabled={!exercise}>Svaly</TabsTrigger>
          <TabsTrigger value="equipment" disabled={!exercise}>Vybavení</TabsTrigger>
          <TabsTrigger value="relations" disabled={!exercise}>Vztahy</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Název (CZ) *</Label>
              <Input
                value={formData.name_cs}
                onChange={(e) => setFormData({ ...formData, name_cs: e.target.value })}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Název (EN)</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="glass-input"
              />
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Podkategorie</Label>
              <Input
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="glass-input"
              />
            </div>
          </div>

          {/* Classification */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pohybový vzor</Label>
              <Select
                value={formData.movement_pattern || 'none'}
                onValueChange={(v) => setFormData({ ...formData, movement_pattern: v === 'none' ? '' : v as MovementPattern })}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vybrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {MOVEMENT_PATTERNS.map(p => (
                    <SelectItem key={p} value={p}>{MOVEMENT_PATTERN_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obtížnost</Label>
              <Select
                value={formData.difficulty || 'none'}
                onValueChange={(v) => setFormData({ ...formData, difficulty: v === 'none' ? '' : v as Difficulty })}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Vybrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Výchozí jednotka</Label>
              <Select
                value={formData.default_unit}
                onValueChange={(v) => setFormData({ ...formData, default_unit: v as DefaultUnit })}
              >
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_UNITS.map(u => (
                    <SelectItem key={u} value={u}>{DEFAULT_UNIT_LABELS[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_unilateral}
                onCheckedChange={(v) => setFormData({ ...formData, is_unilateral: v })}
              />
              <Label>Unilaterální</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_bodyweight}
                onCheckedChange={(v) => setFormData({ ...formData, is_bodyweight: v })}
              />
              <Label>Bodyweight</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_time_based}
                onCheckedChange={(v) => setFormData({ 
                  ...formData, 
                  is_time_based: v,
                  default_unit: v ? 'seconds' : formData.default_unit,
                })}
              />
              <Label>Časový</Label>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Instrukce (CZ)</Label>
            <Textarea
              value={formData.instructions_cs}
              onChange={(e) => setFormData({ ...formData, instructions_cs: e.target.value })}
              className="glass-input min-h-[80px]"
              placeholder="Jak správně provést cvik..."
            />
          </div>
          <div className="space-y-2">
            <Label>Instrukce (EN)</Label>
            <Textarea
              value={formData.instructions_en}
              onChange={(e) => setFormData({ ...formData, instructions_en: e.target.value })}
              className="glass-input min-h-[80px]"
            />
          </div>

          {/* Media */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="glass-input"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Obrázek URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="glass-input"
                placeholder="https://..."
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="muscles" className="space-y-4 mt-4">
          {!exercise ? (
            <p className="text-muted-foreground text-sm">Nejprve uložte cvik pro přidání svalů.</p>
          ) : (
            <>
              {/* Current muscles */}
              <div className="flex flex-wrap gap-2">
                {muscles.map((m) => (
                  <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                    {MUSCLE_LABELS[m.muscle]} ({ROLE_LABELS[m.role]})
                    <button onClick={() => removeMuscle.mutate(m.id)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {muscles.length === 0 && (
                  <p className="text-muted-foreground text-sm">Žádné svaly</p>
                )}
              </div>

              {/* Add muscle */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Sval</Label>
                  <Select
                    value={newMuscle.muscle || 'none'}
                    onValueChange={(v) => setNewMuscle({ ...newMuscle, muscle: v === 'none' ? '' : v as Muscle })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Vybrat sval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Vybrat...</SelectItem>
                      {MUSCLES.filter(m => !muscles.some(em => em.muscle === m)).map(m => (
                        <SelectItem key={m} value={m}>{MUSCLE_LABELS[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newMuscle.role}
                    onValueChange={(v) => setNewMuscle({ ...newMuscle, role: v as MuscleRole })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMuscle} disabled={!newMuscle.muscle} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4 mt-4">
          {!exercise ? (
            <p className="text-muted-foreground text-sm">Nejprve uložte cvik pro přidání vybavení.</p>
          ) : (
            <>
              {/* Current equipment */}
              <div className="flex flex-wrap gap-2">
                {equipment.map((e) => (
                  <Badge key={e.id} variant="secondary" className="gap-1 pr-1">
                    {EQUIPMENT_LABELS[e.equipment]}
                    <button onClick={() => removeEquipment.mutate(e.id)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {equipment.length === 0 && (
                  <p className="text-muted-foreground text-sm">Žádné vybavení</p>
                )}
              </div>

              {/* Add equipment */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Vybavení</Label>
                  <Select
                    value={newEquipment || 'none'}
                    onValueChange={(v) => setNewEquipment(v === 'none' ? '' : v as Equipment)}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Vybrat vybavení" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Vybrat...</SelectItem>
                      {EQUIPMENT_OPTIONS.filter(e => !equipment.some(eq => eq.equipment === e)).map(e => (
                        <SelectItem key={e} value={e}>{EQUIPMENT_LABELS[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddEquipment} disabled={!newEquipment} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="relations" className="space-y-4 mt-4">
          {!exercise ? (
            <p className="text-muted-foreground text-sm">Nejprve uložte cvik pro přidání vztahů.</p>
          ) : (
            <>
              {/* Current relations */}
              <div className="space-y-2">
                {relations.map((r) => {
                  const relatedEx = exercises.find(e => e.id === r.related_exercise_id);
                  return (
                    <div key={r.id} className="flex items-center justify-between glass-subtle p-2 rounded-lg">
                      <div>
                        <Badge variant="outline" className="mr-2">{RELATION_LABELS[r.relation_type]}</Badge>
                        <span>{relatedEx?.name_cs || relatedEx?.name || 'Neznámý cvik'}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeRelation.mutate(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
                {relations.length === 0 && (
                  <p className="text-muted-foreground text-sm">Žádné vztahy</p>
                )}
              </div>

              {/* Add relation */}
              <div className="flex gap-2 items-end">
                <div className="w-32 space-y-2">
                  <Label>Typ</Label>
                  <Select
                    value={newRelation.type}
                    onValueChange={(v) => setNewRelation({ ...newRelation, type: v as RelationType })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{RELATION_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Cvik</Label>
                  <Select
                    value={newRelation.relatedId || 'none'}
                    onValueChange={(v) => setNewRelation({ ...newRelation, relatedId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Vybrat cvik" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Vybrat...</SelectItem>
                      {otherExercises.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name_cs || e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddRelation} disabled={!newRelation.relatedId} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-6 flex justify-between">
        {exercise && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Smazat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong">
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat cvik?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tato akce je nevratná. Cvik "{exercise.name_cs || exercise.name}" bude trvale odstraněn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSubmit} disabled={!formData.name_cs}>
            {exercise ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
