import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { X, Plus, Dumbbell } from 'lucide-react';
import { useExercises, MOVEMENT_PATTERNS, DIFFICULTIES, EQUIPMENT_OPTIONS, type Exercise } from '@/hooks/useExercises';

const EXERCISE_TYPES = ['strength', 'cardio', 'mixed'] as const;
const ENVIRONMENTS = ['gym', 'outdoor', 'home', 'treadmill', 'rower', 'skillup', 'any'] as const;
const RISK_LEVELS = ['low', 'medium', 'high'] as const;
const FATIGUE_LEVELS = ['low', 'medium', 'high'] as const;
const METRICS = ['weight', 'reps', 'sets', 'time', 'distance', 'pace', 'power', 'heart_rate', 'rpe'] as const;
const BODY_AREAS = ['knee', 'hip', 'shoulder', 'back', 'neck', 'ankle', 'wrist', 'elbow'] as const;

const LABELS = {
  exercise_type: { strength: 'Silový', cardio: 'Kardio', mixed: 'Kombinovaný' },
  environment: { gym: 'Posilovna', outdoor: 'Venku', home: 'Doma', treadmill: 'Běžecký pás', rower: 'Veslařský trenažér', skillup: 'SkillUp', any: 'Kdekoliv' },
  risk: { low: 'Nízké', medium: 'Střední', high: 'Vysoké' },
  fatigue: { low: 'Nízká', medium: 'Střední', high: 'Vysoká' },
  metrics: { weight: 'Váha', reps: 'Opakování', sets: 'Série', time: 'Čas', distance: 'Vzdálenost', pace: 'Tempo', power: 'Výkon', heart_rate: 'Tepová frekvence', rpe: 'RPE' },
  body_areas: { knee: 'Koleno', hip: 'Kyčel', shoulder: 'Rameno', back: 'Záda', neck: 'Krk', ankle: 'Kotník', wrist: 'Zápěstí', elbow: 'Loket' },
  movement: {
    squat: 'Dřep', hinge: 'Hip hinge', lunge: 'Výpad',
    push_horizontal: 'Tlak horizontální', push_vertical: 'Tlak vertikální',
    pull_horizontal: 'Tah horizontální', pull_vertical: 'Tah vertikální',
    carry: 'Přenášení', core_anti_extension: 'Core anti-extenze',
    core_anti_rotation: 'Core anti-rotace', core_anti_lateral_flexion: 'Core anti-laterální flexe',
    rotation: 'Rotace', locomotion: 'Lokomoce', conditioning: 'Kondice', mobility: 'Mobilita', other: 'Ostatní',
  },
  difficulty: { beginner: 'Začátečník', intermediate: 'Pokročilý', advanced: 'Expert' },
  equipment: {
    bodyweight: 'Vlastní váha', barbell: 'Činka', dumbbell: 'Jednoručky', kettlebell: 'Kettlebell',
    cable: 'Kladka', machine: 'Stroj', bands: 'Gumy', bench: 'Lavice', pullup_bar: 'Hrazda',
    rings: 'Kruhy', trx: 'TRX', box: 'Bedna', medicine_ball: 'Medicinbal', slam_ball: 'Slam ball',
    rower: 'Veslovací trenažér', ski_erg: 'Ski erg', treadmill: 'Běžecký pás',
    treadmill_sled_mode: 'Běžecký pás (sled)', sled: 'Sáně', landmine: 'Landmine',
    hex_bar: 'Hex bar', plyo_platform: 'Plyometrická platforma', other: 'Jiné',
  },
};

const formSchema = z.object({
  name_cs: z.string().min(2, 'Název musí mít alespoň 2 znaky'),
  name_en: z.string().optional(),
  category: z.string().min(1, 'Vyberte kategorii'),
  description_cs: z.string().optional(),
  instructions_cs: z.string().optional(),
  exercise_type_v2: z.enum(EXERCISE_TYPES),
  movement_pattern: z.string().optional().nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().nullable(),
  environment: z.enum(ENVIRONMENTS),
  equipment: z.array(z.string()),
  muscle_groups: z.array(z.string()).min(1, 'Vyberte alespoň jednu svalovou skupinu'),
  supported_metrics: z.array(z.string()),
  is_unilateral: z.boolean(),
  is_bodyweight: z.boolean(),
  is_time_based: z.boolean(),
  risk_level: z.enum(RISK_LEVELS),
  subjective_difficulty: z.number().min(1).max(5),
  recovery_hours: z.number().min(0).max(168),
  fatigue_accumulation: z.enum(FATIGUE_LEVELS),
  contraindicated_areas: z.array(z.string()),
  requires_supervision: z.boolean(),
  risk_notes: z.string().optional(),
  trainer_notes: z.string().optional(),
  rehab_safe: z.boolean(),
}).refine(
  (data) => {
    // For strength exercises, movement_pattern should be required
    const strengthCategories = ['Síla', 'Horní tělo', 'Dolní tělo', 'Nohy', 'Paže', 'Záda', 'Hrudník', 'Ramena'];
    if (strengthCategories.includes(data.category) && !data.movement_pattern) {
      return false;
    }
    return true;
  },
  {
    message: 'Pohybový vzorec je povinný pro silové cviky',
    path: ['movement_pattern'],
  }
);

type FormData = z.infer<typeof formSchema>;

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  onDuplicate?: boolean;
}

export function ExerciseFormDialog({ open, onOpenChange, exercise, onDuplicate }: ExerciseFormDialogProps) {
  const { createExercise, updateExercise, categories } = useExercises();
  const [newCategory, setNewCategory] = useState('');

  const isEditing = !!exercise && !onDuplicate;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name_cs: '',
      name_en: '',
      category: '',
      description_cs: '',
      instructions_cs: '',
      exercise_type_v2: 'strength',
      movement_pattern: null,
      difficulty: null,
      environment: 'gym',
      equipment: [],
      muscle_groups: [],
      supported_metrics: ['weight', 'reps', 'sets'],
      is_unilateral: false,
      is_bodyweight: false,
      is_time_based: false,
      risk_level: 'low',
      subjective_difficulty: 3,
      recovery_hours: 48,
      fatigue_accumulation: 'medium',
      contraindicated_areas: [],
      requires_supervision: false,
      risk_notes: '',
      trainer_notes: '',
      rehab_safe: false,
    },
  });

  useEffect(() => {
    if (exercise) {
      form.reset({
        name_cs: onDuplicate ? `${exercise.name_cs || exercise.name} (kopie)` : (exercise.name_cs || exercise.name),
        name_en: exercise.name_en || '',
        category: exercise.category || '',
        description_cs: exercise.description_cs || '',
        instructions_cs: exercise.instructions_cs || '',
        exercise_type_v2: (exercise as any).exercise_type_v2 || 'strength',
        movement_pattern: exercise.movement_pattern || null,
        difficulty: exercise.difficulty || null,
        environment: (exercise as any).environment || 'gym',
        equipment: exercise.equipment || [],
        muscle_groups: exercise.muscle_groups || [],
        supported_metrics: (exercise as any).supported_metrics || ['weight', 'reps', 'sets'],
        is_unilateral: exercise.is_unilateral || false,
        is_bodyweight: exercise.is_bodyweight || false,
        is_time_based: exercise.is_time_based || false,
        risk_level: (exercise as any).risk_level || 'low',
        subjective_difficulty: (exercise as any).subjective_difficulty || 3,
        recovery_hours: (exercise as any).recovery_hours || 48,
        fatigue_accumulation: (exercise as any).fatigue_accumulation || 'medium',
        contraindicated_areas: (exercise as any).contraindicated_areas || [],
        requires_supervision: (exercise as any).requires_supervision || false,
        risk_notes: (exercise as any).risk_notes || '',
        trainer_notes: (exercise as any).trainer_notes || '',
        rehab_safe: (exercise as any).rehab_safe || false,
      });
    } else {
      form.reset();
    }
  }, [exercise, onDuplicate, form]);

  const onSubmit = async (data: FormData) => {
    const payload: any = {
      ...data,
      name: data.name_cs,
      category: data.category === '_new' ? newCategory : data.category,
      difficulty: data.difficulty || null,
      movement_pattern: data.movement_pattern || null,
    };

    if (isEditing && exercise) {
      await updateExercise.mutateAsync({ id: exercise.id, ...payload });
    } else {
      await createExercise.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const toggleArrayItem = (field: 'equipment' | 'muscle_groups' | 'supported_metrics' | 'contraindicated_areas', item: string) => {
    const current = form.getValues(field);
    if (current.includes(item)) {
      form.setValue(field, current.filter(i => i !== item));
    } else {
      form.setValue(field, [...current, item]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            {isEditing ? 'Upravit cvik' : onDuplicate ? 'Duplikovat cvik' : 'Nový cvik'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[calc(90vh-140px)]">
              <Tabs defaultValue="basic" className="px-6">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="basic">Základní</TabsTrigger>
                  <TabsTrigger value="metrics">Metriky</TabsTrigger>
                  <TabsTrigger value="health">Zdraví</TabsTrigger>
                  <TabsTrigger value="notes">Poznámky</TabsTrigger>
                </TabsList>

                {/* Basic Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name_cs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název cviku *</FormLabel>
                        <FormControl>
                          <Input placeholder="Např. Bench press" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anglický název</FormLabel>
                        <FormControl>
                          <Input placeholder="Např. Bench press" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategorie *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Vyberte kategorii" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="_new">+ Nová kategorie</SelectItem>
                            </SelectContent>
                          </Select>
                          {field.value === '_new' && (
                            <Input
                              className="mt-2"
                              placeholder="Název nové kategorie"
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                            />
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exercise_type_v2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ cviku</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXERCISE_TYPES.map(type => (
                                <SelectItem key={type} value={type}>{LABELS.exercise_type[type]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="movement_pattern"
                      render={({ field }) => {
                        const strengthCategories = ['Síla', 'Horní tělo', 'Dolní tělo', 'Nohy', 'Paže', 'Záda', 'Hrudník', 'Ramena'];
                        const isStrength = strengthCategories.includes(form.watch('category'));
                        return (
                          <FormItem>
                            <FormLabel>
                              Pohybový vzorec {isStrength && '*'}
                            </FormLabel>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Vyberte" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {MOVEMENT_PATTERNS.map(p => (
                                  <SelectItem key={p} value={p}>{LABELS.movement[p]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Obtížnost</FormLabel>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Vyberte" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DIFFICULTIES.map(d => (
                                <SelectItem key={d} value={d}>{LABELS.difficulty[d]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prostředí</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ENVIRONMENTS.map(e => (
                              <SelectItem key={e} value={e}>{LABELS.environment[e]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="equipment"
                    render={() => (
                      <FormItem>
                        <FormLabel>Vybavení</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {EQUIPMENT_OPTIONS.map(eq => (
                            <Badge
                              key={eq}
                              variant={form.watch('equipment').includes(eq) ? 'default' : 'outline'}
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => toggleArrayItem('equipment', eq)}
                            >
                              {LABELS.equipment[eq]}
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="is_unilateral"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Unilaterální</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_bodyweight"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Vlastní váha</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_time_based"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Na čas</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supported_metrics"
                    render={() => (
                      <FormItem>
                        <FormLabel>Podporované metriky</FormLabel>
                        <FormDescription>Které hodnoty lze sledovat u tohoto cviku</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {METRICS.map(m => (
                            <Badge
                              key={m}
                              variant={form.watch('supported_metrics').includes(m) ? 'default' : 'outline'}
                              className="cursor-pointer hover:bg-primary/20"
                              onClick={() => toggleArrayItem('supported_metrics', m)}
                            >
                              {LABELS.metrics[m]}
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subjective_difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subjektivní náročnost: {field.value}/5</FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recovery_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Doporučená regenerace: {field.value} hodin</FormLabel>
                        <FormControl>
                          <Slider
                            min={12}
                            max={120}
                            step={12}
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fatigue_accumulation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kumulace únavy</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FATIGUE_LEVELS.map(f => (
                              <SelectItem key={f} value={f}>{LABELS.fatigue[f]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Health Tab */}
                <TabsContent value="health" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="risk_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Úroveň rizika</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RISK_LEVELS.map(r => (
                              <SelectItem key={r} value={r}>{LABELS.risk[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contraindicated_areas"
                    render={() => (
                      <FormItem>
                        <FormLabel>Nevhodné při problémech s</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {BODY_AREAS.map(a => (
                            <Badge
                              key={a}
                              variant={form.watch('contraindicated_areas').includes(a) ? 'destructive' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => toggleArrayItem('contraindicated_areas', a)}
                            >
                              {LABELS.body_areas[a]}
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requires_supervision"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Vyžaduje technický dohled</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rehab_safe"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!m-0">Vhodný pro rehabilitaci</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="risk_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poznámky k rizikům</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Specifická rizika a doporučení..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description_cs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis cviku</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Stručný popis cviku..." {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instructions_cs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instrukce k provedení</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Jak správně provést cvik..." {...field} rows={5} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trainer_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interní poznámky trenéra</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Poznámky viditelné pouze trenérovi..." {...field} rows={3} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>

            <div className="flex justify-end gap-2 p-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={createExercise.isPending || updateExercise.isPending}>
                {isEditing ? 'Uložit změny' : 'Vytvořit cvik'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
