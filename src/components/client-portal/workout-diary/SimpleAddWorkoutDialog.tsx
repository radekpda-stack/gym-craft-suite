import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  PersonStanding
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Simplified workout types with large icons
const SIMPLE_WORKOUT_TYPES = [
  { value: 'strength', label: 'Posilovna', icon: Dumbbell, color: 'text-orange-500 bg-orange-500/10' },
  { value: 'run', label: 'Běh', icon: Footprints, color: 'text-emerald-500 bg-emerald-500/10' },
  { value: 'cycling', label: 'Kolo', icon: Bike, color: 'text-blue-500 bg-blue-500/10' },
  { value: 'walk', label: 'Chůze', icon: PersonStanding, color: 'text-teal-500 bg-teal-500/10' },
  { value: 'swimming', label: 'Plavání', icon: Waves, color: 'text-cyan-500 bg-cyan-500/10' },
  { value: 'mobility', label: 'Protažení', icon: MoveHorizontal, color: 'text-purple-500 bg-purple-500/10' },
  { value: 'other', label: 'Jiné', icon: Sparkles, color: 'text-pink-500 bg-pink-500/10' },
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

interface SimpleAddWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    workoutType: string;
    durationMinutes: number;
    feeling: number;
    notes: string;
    date: string;
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

  const resetForm = () => {
    setStep('type');
    setWorkoutType(null);
    setDuration(30);
    setFeeling(4);
    setNotes('');
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
    
    await onSave({
      workoutType,
      durationMinutes: duration,
      feeling,
      notes,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    
    handleClose();
  };

  const selectedType = SIMPLE_WORKOUT_TYPES.find(t => t.value === workoutType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
              className="grid grid-cols-2 gap-3 py-4"
            >
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
            </motion.div>
          )}

          {/* Step 2: Duration & Feeling */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
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
                <p className="text-sm text-muted-foreground text-center">Jak dlouho? (minuty)</p>
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
                <p className="text-sm text-muted-foreground text-center">Jak se cítíš po tréninku?</p>
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
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
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

              {/* Notes */}
              <div className="space-y-2">
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
