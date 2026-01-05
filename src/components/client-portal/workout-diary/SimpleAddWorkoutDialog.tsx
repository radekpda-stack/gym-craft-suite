import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  Dumbbell, 
  Bike, 
  Waves, 
  MoveHorizontal, 
  Footprints,
  Sparkles,
  ArrowLeft,
  Send,
  Check,
  PersonStanding,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';

// Simplified workout types with large icons
const SIMPLE_WORKOUT_TYPES = [
  { value: 'strength', label: 'Posilovna', icon: Dumbbell, color: 'text-orange-500 bg-orange-500/10', isCardio: false },
  { value: 'run', label: 'Běh', icon: Footprints, color: 'text-emerald-500 bg-emerald-500/10', isCardio: true },
  { value: 'cycling', label: 'Kolo', icon: Bike, color: 'text-blue-500 bg-blue-500/10', isCardio: true },
  { value: 'walk', label: 'Chůze', icon: PersonStanding, color: 'text-teal-500 bg-teal-500/10', isCardio: true },
  { value: 'swimming', label: 'Plavání', icon: Waves, color: 'text-cyan-500 bg-cyan-500/10', isCardio: true },
  { value: 'mobility', label: 'Protažení', icon: MoveHorizontal, color: 'text-purple-500 bg-purple-500/10', isCardio: false },
  { value: 'other', label: 'Jiné', icon: Sparkles, color: 'text-pink-500 bg-pink-500/10', isCardio: false },
];

// Duration options
const DURATION_OPTIONS = [15, 30, 45, 60, 90];

// Feeling emojis
const FEELING_EMOJIS = [
  { value: 1, emoji: '😩', label: 'Hrozné' },
  { value: 2, emoji: '😕', label: 'Špatné' },
  { value: 3, emoji: '😐', label: 'Normální' },
  { value: 4, emoji: '😊', label: 'Dobré' },
  { value: 5, emoji: '🔥', label: 'Skvělé!' },
];

// Exercise input interface
interface ExerciseInput {
  name: string;
  exerciseId?: string;
  sets: string;
  reps: string;
  weight: string;
}

const emptyExercise: ExerciseInput = { name: '', sets: '', reps: '', weight: '' };

interface SimpleAddWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    workoutType: string;
    durationMinutes: number;
    feeling: number;
    notes: string;
    date: string;
    distanceKm?: number;
    paceMinPerKm?: string;
    exercises?: Array<{
      exercise_name: string;
      exercise_id?: string | null;
      sets?: number;
      reps?: number;
      weight_kg?: number;
    }>;
  }) => Promise<void>;
  isSaving: boolean;
}

type Step = 'type' | 'details' | 'note';

export function SimpleAddWorkoutDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: SimpleAddWorkoutDialogProps) {
  const [step, setStep] = useState<Step>('type');
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [feeling, setFeeling] = useState<number>(4);
  const [notes, setNotes] = useState('');
  
  // Cardio metrics
  const [distanceKm, setDistanceKm] = useState('');
  const [paceMinPerKm, setPaceMinPerKm] = useState('');
  
  // Strength exercises
  const [exercises, setExercises] = useState<ExerciseInput[]>([{ ...emptyExercise }]);
  
  // Details expansion
  const [showDetails, setShowDetails] = useState(false);

  const resetForm = () => {
    setStep('type');
    setWorkoutType(null);
    setDuration(30);
    setFeeling(4);
    setNotes('');
    setDistanceKm('');
    setPaceMinPerKm('');
    setExercises([{ ...emptyExercise }]);
    setShowDetails(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleSelectType = (type: string) => {
    setWorkoutType(type);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') setStep('type');
    else if (step === 'note') setStep('details');
  };

  const handleNext = () => {
    if (step === 'details') setStep('note');
  };

  const handleSave = async () => {
    if (!workoutType) return;
    
    // Build exercises array
    const validExercises = exercises
      .filter(ex => ex.name.trim())
      .map(ex => ({
        exercise_name: ex.name,
        exercise_id: ex.exerciseId || null,
        sets: ex.sets ? parseInt(ex.sets) : undefined,
        reps: ex.reps ? parseInt(ex.reps) : undefined,
        weight_kg: ex.weight ? parseFloat(ex.weight) : undefined,
      }));
    
    await onSave({
      workoutType,
      durationMinutes: duration,
      feeling,
      notes,
      date: format(new Date(), 'yyyy-MM-dd'),
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      paceMinPerKm: paceMinPerKm || undefined,
      exercises: validExercises.length > 0 ? validExercises : undefined,
    });
    
    handleClose();
  };

  const selectedType = SIMPLE_WORKOUT_TYPES.find(t => t.value === workoutType);
  const isCardioType = selectedType?.isCardio || false;
  const isStrengthType = workoutType === 'strength';

  // Exercise handlers
  const addExercise = () => {
    setExercises([...exercises, { ...emptyExercise }]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const updateExercise = (index: number, field: keyof ExerciseInput, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  const updateExerciseName = (index: number, name: string, exerciseId?: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], name, exerciseId };
    setExercises(updated);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'type' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span>
              {step === 'type' && '💪 Co jsi dělal/a?'}
              {step === 'details' && '⏱️ Jak to šlo?'}
              {step === 'note' && '📝 Chceš něco dodat?'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Workout Type */}
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-4"
            >
              {/* Tip */}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm mb-4">
                <span className="text-lg">💡</span>
                <p className="text-muted-foreground">
                  Vyber typ aktivity, kterou chceš zapsat. Trenér uvidí, co děláš i mimo společné tréninky.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {SIMPLE_WORKOUT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleSelectType(type.value)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-6 rounded-xl transition-all",
                      "border-2 hover:scale-[1.02] active:scale-[0.98]",
                      type.color,
                      "border-transparent hover:border-current/30"
                    )}
                  >
                    <type.icon className="w-10 h-10" />
                    <span className="font-medium text-foreground">{type.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Duration, Feeling & Details */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 py-4"
            >
              {/* Selected type indicator */}
              {selectedType && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg mx-auto w-fit",
                  selectedType.color
                )}>
                  <selectedType.icon className="w-5 h-5" />
                  <span className="font-medium">{selectedType.label}</span>
                </div>
              )}

              {/* Duration */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-center">Jak dlouho? (minuty)</p>
                <p className="text-xs text-muted-foreground text-center -mt-2">Stiskni počet minut</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {DURATION_OPTIONS.map((min) => (
                    <button
                      key={min}
                      onClick={() => setDuration(min)}
                      className={cn(
                        "px-4 py-3 rounded-lg font-medium transition-all text-lg min-w-[60px]",
                        duration === min
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {min}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feeling */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-center">Jak se cítíš po tréninku?</p>
                <p className="text-xs text-muted-foreground text-center -mt-2">Čím víc vpravo, tím lépe</p>
                <div className="flex justify-center gap-2">
                  {FEELING_EMOJIS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFeeling(f.value)}
                      title={f.label}
                      className={cn(
                        "w-14 h-14 text-3xl rounded-xl transition-all",
                        "hover:scale-110 active:scale-95",
                        feeling === f.value
                          ? "bg-primary/20 ring-2 ring-primary/50 scale-110"
                          : "bg-muted/50 opacity-60 hover:opacity-100"
                      )}
                    >
                      {f.emoji}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-2">
                  <span>Hrozně</span>
                  <span>Skvěle!</span>
                </div>
              </div>

              {/* Expandable Details Section */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Skrýt podrobnosti
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Přidat podrobnosti
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-4">
                        {/* Cardio metrics */}
                        {isCardioType && (
                          <div className={cn(
                            "p-4 rounded-lg space-y-3",
                            selectedType?.color
                          )}>
                            <div className="flex items-center gap-2 font-medium text-sm">
                              {selectedType && <selectedType.icon className="w-4 h-4" />}
                              Metriky
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Vzdálenost (km)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="5.0"
                                  value={distanceKm}
                                  onChange={(e) => setDistanceKm(e.target.value)}
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Tempo (min/km)</Label>
                                <Input
                                  type="text"
                                  placeholder="5:30"
                                  value={paceMinPerKm}
                                  onChange={(e) => setPaceMinPerKm(e.target.value)}
                                  className="h-10"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Strength exercises */}
                        {isStrengthType && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 font-medium text-sm text-orange-600">
                              <Dumbbell className="w-4 h-4" />
                              Cviky
                            </div>
                            
                            {exercises.map((exercise, idx) => (
                              <div key={idx} className="p-3 bg-muted/50 rounded-lg space-y-3 relative">
                                {exercises.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => removeExercise(idx)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                                
                                <ExerciseAutocomplete
                                  value={exercise.name}
                                  onChange={(name, exerciseId) => updateExerciseName(idx, name, exerciseId)}
                                  placeholder="Název cviku"
                                />
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Série</Label>
                                    <Input
                                      type="number"
                                      placeholder="3"
                                      value={exercise.sets}
                                      onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Opakování</Label>
                                    <Input
                                      type="number"
                                      placeholder="10"
                                      value={exercise.reps}
                                      onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Váha (kg)</Label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      placeholder="50"
                                      value={exercise.weight}
                                      onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={addExercise}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Přidat další cvik
                            </Button>
                          </div>
                        )}

                        {/* Other types - simple note */}
                        {!isCardioType && !isStrengthType && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Další podrobnosti můžeš přidat v poznámce v dalším kroku.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button 
                className="w-full h-12 text-lg"
                onClick={handleNext}
              >
                Pokračovat
              </Button>
            </motion.div>
          )}

          {/* Step 3: Notes */}
          {step === 'note' && (
            <motion.div
              key="note"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              {/* Summary */}
              <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  {selectedType && (
                    <div className={cn("p-2 rounded-lg", selectedType.color)}>
                      <selectedType.icon className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-lg font-medium">{duration} min</span>
                  <span className="text-2xl">
                    {FEELING_EMOJIS.find(f => f.value === feeling)?.emoji}
                  </span>
                </div>
                
                {/* Show cardio details in summary */}
                {isCardioType && (distanceKm || paceMinPerKm) && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {distanceKm && <span>{distanceKm} km</span>}
                    {paceMinPerKm && <span>@ {paceMinPerKm} min/km</span>}
                  </div>
                )}
                
                {/* Show exercises in summary */}
                {isStrengthType && exercises.some(e => e.name.trim()) && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {exercises.filter(e => e.name.trim()).map((ex, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full"
                      >
                        {ex.name}
                        {ex.weight && ` ${ex.weight}kg`}
                        {ex.sets && ex.reps && ` (${ex.sets}×${ex.reps})`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                {/* Tip */}
                <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-sm mb-2">
                  <span className="text-lg">💡</span>
                  <p className="text-muted-foreground">
                    Napiš trenérovi, jak se ti dařilo, nebo co bys rád/a zlepšil/a
                  </p>
                </div>
                <Textarea
                  placeholder="Co šlo dobře? Co tě potěšilo? (volitelné)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Trenér uvidí tvůj záznam a může ti odpovědět
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => {
                    setNotes('');
                    handleSave();
                  }}
                  disabled={isSaving}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Uložit
                </Button>
                <Button 
                  className="flex-1 h-12 text-lg"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSaving ? 'Odesílám...' : 'Odeslat trenérovi'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
