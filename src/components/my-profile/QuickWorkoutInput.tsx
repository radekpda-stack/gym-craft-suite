import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Dumbbell, 
  Timer, 
  Zap, 
  Check, 
  Plus,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickWorkoutInputProps {
  clientId: string;
}

type InputMode = 'strength' | 'cardio';

const QUICK_EXERCISES = [
  { name: 'Bench Press', icon: '🏋️', type: 'strength' },
  { name: 'Squat', icon: '🦵', type: 'strength' },
  { name: 'Deadlift', icon: '💪', type: 'strength' },
  { name: 'Pull-up', icon: '🔼', type: 'strength' },
  { name: 'Rowing', icon: '🚣', type: 'cardio' },
  { name: 'Running', icon: '🏃', type: 'cardio' },
];

export function QuickWorkoutInput({ clientId }: QuickWorkoutInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<InputMode>('strength');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Strength fields
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('1');
  
  // Cardio fields
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch exercises for autocomplete
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-autocomplete'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, name_cs, category')
        .eq('is_archived', false)
        .limit(100);
      return data || [];
    },
  });

  const exerciseName = customExercise || selectedExercise;

  const createStrengthEntry = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const exercise = exercises.find(
        e => e.name.toLowerCase() === exerciseName.toLowerCase() ||
             e.name_cs?.toLowerCase() === exerciseName.toLowerCase()
      );

      const { error } = await supabase
        .from('exercise_entries')
        .insert({
          user_id: user.id,
          client_id: clientId,
          exercise_id: exercise?.id || null,
          exercise_name: exerciseName,
          date: format(new Date(), 'yyyy-MM-dd'),
          sets: parseInt(sets) || 1,
          reps: parseInt(reps) || null,
          weight_kg: parseFloat(weight) || null,
        });

      if (error) throw error;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const createCardioEntry = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const durationSeconds = parseDuration(duration);
      const distanceMeters = parseFloat(distance) * 1000;

      const { error } = await supabase
        .from('cardio_entries')
        .insert({
          user_id: user.id,
          client_id: clientId,
          exercise_name: exerciseName,
          date: format(new Date(), 'yyyy-MM-dd'),
          duration_seconds: durationSeconds || 0,
          distance_meters: distanceMeters || null,
        });

      if (error) throw error;
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
    queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
    queryClient.invalidateQueries({ queryKey: ['client-prs'] });
    queryClient.invalidateQueries({ queryKey: ['trainer-recent-performance'] });
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      resetForm();
    }, 1500);
    
    toast({
      title: '✅ Výkon uložen',
      description: `${exerciseName} zaznamenán`,
    });
  }

  function handleError(error: Error) {
    toast({
      title: 'Chyba',
      description: error.message,
      variant: 'destructive',
    });
  }

  function resetForm() {
    setWeight('');
    setReps('');
    setSets('1');
    setDistance('');
    setDuration('');
    setCustomExercise('');
    setSelectedExercise('');
    setIsExpanded(false);
  }

  function parseDuration(value: string): number | null {
    if (!value) return null;
    const parts = value.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parseInt(value) * 60;
  }

  const handleQuickSelect = (exercise: typeof QUICK_EXERCISES[0]) => {
    setSelectedExercise(exercise.name);
    setCustomExercise('');
    setMode(exercise.type as InputMode);
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const canSave = exerciseName && (
    mode === 'strength' ? (weight || reps) : (distance || duration)
  );

  const isPending = createStrengthEntry.isPending || createCardioEntry.isPending;

  const handleSave = () => {
    if (mode === 'strength') {
      createStrengthEntry.mutate();
    } else {
      createCardioEntry.mutate();
    }
  };

  return (
    <div className="relative">
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-success" />
              </motion.div>
              <span className="text-lg font-semibold">Uloženo!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass rounded-2xl p-4 space-y-4">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Rychlé zadání</h3>
              <p className="text-xs text-muted-foreground">Jeden klik → záznam</p>
            </div>
          </div>
          
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
            <button
              onClick={() => setMode('strength')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                mode === 'strength' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className="w-3.5 h-3.5 inline mr-1" />
              Síla
            </button>
            <button
              onClick={() => setMode('cardio')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                mode === 'cardio' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Timer className="w-3.5 h-3.5 inline mr-1" />
              Cardio
            </button>
          </div>
        </div>

        {/* Quick exercise chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_EXERCISES
            .filter(e => e.type === mode)
            .map((exercise) => (
              <button
                key={exercise.name}
                onClick={() => handleQuickSelect(exercise)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5",
                  "border border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  selectedExercise === exercise.name && "border-primary bg-primary/10 text-primary"
                )}
              >
                <span>{exercise.icon}</span>
                {exercise.name}
              </button>
            ))}
          
          {/* Custom exercise input */}
          <div className="relative">
            <Input
              placeholder="Jiný cvik..."
              value={customExercise}
              onChange={(e) => {
                setCustomExercise(e.target.value);
                setSelectedExercise('');
                if (e.target.value) setIsExpanded(true);
              }}
              className="w-32 h-9 text-sm bg-secondary/30 border-border/50"
            />
          </div>
        </div>

        {/* Expanded input fields */}
        <AnimatePresence>
          {(isExpanded || exerciseName) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t border-border/30 space-y-3">
                {/* Selected exercise indicator */}
                {exerciseName && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{exerciseName}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedExercise('');
                        setCustomExercise('');
                      }}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {/* Input fields based on mode */}
                {mode === 'strength' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Váha (kg)</label>
                      <Input
                        ref={inputRef}
                        type="number"
                        placeholder="100"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="h-12 text-lg font-semibold text-center bg-secondary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Opakování</label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="h-12 text-lg font-semibold text-center bg-secondary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Série</label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        className="h-12 text-lg font-semibold text-center bg-secondary/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Vzdálenost (km)</label>
                      <Input
                        ref={inputRef}
                        type="number"
                        step="0.1"
                        placeholder="5.0"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        className="h-12 text-lg font-semibold text-center bg-secondary/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Čas (MM:SS)</label>
                      <Input
                        placeholder="25:00"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-12 text-lg font-semibold text-center bg-secondary/30"
                      />
                    </div>
                  </div>
                )}

                {/* Save button */}
                <Button
                  onClick={handleSave}
                  disabled={!canSave || isPending}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Uložit výkon
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
