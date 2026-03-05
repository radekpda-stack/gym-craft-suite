import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useExercises } from '@/hooks/useExercises';
import { usePopularStrengthExercises } from '@/hooks/usePopularExercises';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ExerciseAutocomplete } from '@/components/client-portal/workout-diary/ExerciseAutocomplete';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Dumbbell, Check } from 'lucide-react';

interface TrainerStrengthInputFormProps {
  clientId: string;
}


export function TrainerStrengthInputForm({ clientId }: TrainerStrengthInputFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { exercises } = useExercises();
  const { data: popularExercises = [] } = usePopularStrengthExercises(6);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exerciseId, setExerciseId] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);


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

  const handleAutocompleteSelect = (name: string, id?: string) => {
    setExerciseName(name);
    setExerciseId(id || '');
    if (id) {
      const exercise = exercises.find(e => e.id === id);
      if (exercise) {
        setIsBodyweight(exercise.is_bodyweight);
      }
    }
  };

  const handleQuickExercise = (id: string, name: string) => {
    setExerciseId(id);
    setExerciseName(name);
    const exercise = exercises.find(e => e.id === id);
    if (exercise) {
      setIsBodyweight(exercise.is_bodyweight);
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
        {/* Popular exercises chips */}
        {popularExercises.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Nejpoužívanější</span>
            <div className="flex flex-wrap gap-1.5">
              {popularExercises.map((ex) => (
                <Button
                  key={ex.id}
                  variant={exerciseId === ex.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickExercise(ex.id, ex.name_cs || ex.name)}
                  className="text-xs h-7"
                >
                  {ex.name_cs || ex.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise autocomplete search */}
        <div className="space-y-2">
          <Label>Cvik</Label>
          <ExerciseAutocomplete
            value={exerciseName}
            onChange={handleAutocompleteSelect}
            placeholder="Vyhledat cvik..."
          />
          {exerciseName && (
            <p className="text-xs text-muted-foreground">Vybraný: <span className="font-medium text-foreground">{exerciseName}</span></p>
          )}
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
