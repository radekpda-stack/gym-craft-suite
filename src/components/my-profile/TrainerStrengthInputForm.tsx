import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExercises } from '@/hooks/useExercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Dumbbell, Check } from 'lucide-react';

interface TrainerStrengthInputFormProps {
  clientId: string;
}

const POPULAR_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-up',
  'Dip',
];

export function TrainerStrengthInputForm({ clientId }: TrainerStrengthInputFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exercises } = useExercises();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exerciseId, setExerciseId] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter strength exercises
  const strengthExercises = exercises.filter(
    (e) => e.category === 'Síla' || e.category === 'Strength' || !e.is_time_based
  );

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const selectedExercise = exercises.find(e => e.id === exerciseId);

      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({
          user_id: user.id,
          client_id: clientId,
          exercise_id: exerciseId || null,
          exercise_name: exerciseName || selectedExercise?.name || 'Unknown',
          date,
          sets: parseInt(sets) || 1,
          reps: parseInt(reps) || null,
          weight: isBodyweight ? 0 : parseFloat(weight) || null,
          is_bodyweight: isBodyweight,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      queryClient.invalidateQueries({ queryKey: ['client-prs', clientId] });
      queryClient.invalidateQueries({ queryKey: ['exercise-leaderboard'] });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      // Reset form
      setSets('');
      setReps('');
      setWeight('');
      setNotes('');
      
      toast({
        title: 'Výkon uložen',
        description: 'Silový cvik byl zaznamenán.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodařilo se uložit výkon.',
        variant: 'destructive',
      });
    },
  });

  const handleExerciseChange = (id: string) => {
    setExerciseId(id);
    const exercise = exercises.find(e => e.id === id);
    if (exercise) {
      setExerciseName(exercise.name);
      setIsBodyweight(exercise.is_bodyweight);
    }
  };

  const handleQuickExercise = (name: string) => {
    const exercise = exercises.find(
      e => e.name.toLowerCase().includes(name.toLowerCase()) ||
           e.name_cs?.toLowerCase().includes(name.toLowerCase())
    );
    if (exercise) {
      setExerciseId(exercise.id);
      setExerciseName(exercise.name);
      setIsBodyweight(exercise.is_bodyweight);
    } else {
      setExerciseId('');
      setExerciseName(name);
    }
  };

  const isValid = exerciseName && (sets || reps) && (isBodyweight || weight);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="w-4 h-4" />
          Silový cvik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick select popular exercises */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_EXERCISES.map((name) => (
            <Button
              key={name}
              variant={exerciseName.toLowerCase().includes(name.toLowerCase()) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickExercise(name)}
              className="text-xs"
            >
              {name}
            </Button>
          ))}
        </div>

        {/* Exercise select */}
        <div className="space-y-2">
          <Label>Cvik</Label>
          <Select value={exerciseId} onValueChange={handleExerciseChange}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte cvik..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {strengthExercises.slice(0, 100).map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name_cs || exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Datum</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Sets, Reps, Weight */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Série</Label>
            <Input
              type="number"
              placeholder="3"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label>Opakování</Label>
            <Input
              type="number"
              placeholder="10"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              min="1"
            />
          </div>
          <div className="space-y-2">
            <Label>Váha (kg)</Label>
            <Input
              type="number"
              placeholder="100"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={isBodyweight}
              min="0"
              step="0.5"
            />
          </div>
        </div>

        {/* Bodyweight checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="bodyweight"
            checked={isBodyweight}
            onCheckedChange={(checked) => setIsBodyweight(checked === true)}
          />
          <Label htmlFor="bodyweight" className="text-sm cursor-pointer">
            S vlastní váhou (bodyweight)
          </Label>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Poznámky (volitelné)</Label>
          <Textarea
            placeholder="Poznámky k cviku..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={() => createEntry.mutate()}
          disabled={!isValid || createEntry.isPending}
          className="w-full"
        >
          {createEntry.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : showSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Uloženo!
            </>
          ) : (
            'Uložit výkon'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
