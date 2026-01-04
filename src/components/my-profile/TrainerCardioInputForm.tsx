import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Activity, Check, Trophy } from 'lucide-react';

interface TrainerCardioInputFormProps {
  clientId: string;
}

const CARDIO_EXERCISES = [
  { id: 'rowing', name: 'Veslo (Row)', icon: '🚣' },
  { id: 'skierg', name: 'SkiErg', icon: '⛷️' },
  { id: 'bikeerg', name: 'BikeErg', icon: '🚴' },
  { id: 'run', name: 'Běh', icon: '🏃' },
  { id: 'assault_bike', name: 'Assault Bike', icon: '🚲' },
];

const DISTANCES = [
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
];

export function TrainerCardioInputForm({ clientId }: TrainerCardioInputFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exercise, setExercise] = useState('rowing');
  const [distance, setDistance] = useState('2000');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [centiseconds, setCentiseconds] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPR, setIsPR] = useState(false);

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const exerciseData = CARDIO_EXERCISES.find(e => e.id === exercise);
      const distanceMeters = parseInt(distance);
      const durationSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0) + (parseInt(centiseconds) || 0) / 100;

      // Check if this is a PR
      const { data: existingEntries } = await supabase
        .from('cardio_entries')
        .select('duration_seconds')
        .eq('client_id', clientId)
        .eq('exercise_name', exerciseData?.name || exercise)
        .eq('distance_meters', distanceMeters)
        .not('duration_seconds', 'is', null)
        .order('duration_seconds', { ascending: true })
        .limit(1);

      const isNewPR = !existingEntries?.length || durationSeconds < existingEntries[0].duration_seconds;

      const { data, error } = await supabase
        .from('cardio_entries')
        .insert({
          user_id: user.id,
          client_id: clientId,
          exercise_name: exerciseData?.name || exercise,
          date,
          distance_meters: distanceMeters,
          duration_seconds: durationSeconds,
          notes: notes || null,
          is_pr: isNewPR,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, isNewPR };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cardio-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cardio-stats', clientId] });
      queryClient.invalidateQueries({ queryKey: ['cardio-leaderboard'] });
      
      setShowSuccess(true);
      setIsPR(data.isNewPR);
      setTimeout(() => {
        setShowSuccess(false);
        setIsPR(false);
      }, 3000);
      
      // Reset time fields
      setMinutes('');
      setSeconds('');
      setCentiseconds('');
      setNotes('');
      
      toast({
        title: data.isNewPR ? '🏆 Nový osobní rekord!' : 'Výkon uložen',
        description: data.isNewPR 
          ? 'Gratulujeme k novému PR!' 
          : 'Kardio záznam byl uložen.',
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

  const formatTimePreview = () => {
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    const cs = parseInt(centiseconds) || 0;
    if (m === 0 && s === 0) return null;
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(1, '0')}`;
  };

  const isValid = exercise && distance && (minutes || seconds);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4" />
          Kardio cvičení
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercise selection */}
        <div className="grid grid-cols-5 gap-2">
          {CARDIO_EXERCISES.map((ex) => (
            <Button
              key={ex.id}
              variant={exercise === ex.id ? 'default' : 'outline'}
              onClick={() => setExercise(ex.id)}
              className="flex flex-col h-auto py-2 px-1"
            >
              <span className="text-lg">{ex.icon}</span>
              <span className="text-[10px] mt-1 truncate w-full text-center">{ex.name.split(' ')[0]}</span>
            </Button>
          ))}
        </div>

        {/* Distance selection */}
        <div className="space-y-2">
          <Label>Vzdálenost</Label>
          <div className="flex flex-wrap gap-2">
            {DISTANCES.map((d) => (
              <Button
                key={d.value}
                variant={distance === String(d.value) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDistance(String(d.value))}
              >
                {d.label}
              </Button>
            ))}
          </div>
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

        {/* Time input */}
        <div className="space-y-2">
          <Label>Čas</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="min"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min="0"
                max="999"
                className="text-center"
              />
              <span className="text-xs text-muted-foreground text-center block mt-1">minuty</span>
            </div>
            <span className="text-xl font-bold">:</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="sec"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                min="0"
                max="59"
                className="text-center"
              />
              <span className="text-xs text-muted-foreground text-center block mt-1">sekundy</span>
            </div>
            <span className="text-xl font-bold">.</span>
            <div className="w-16">
              <Input
                type="number"
                placeholder="0"
                value={centiseconds}
                onChange={(e) => setCentiseconds(e.target.value)}
                min="0"
                max="9"
                className="text-center"
              />
              <span className="text-xs text-muted-foreground text-center block mt-1">des.</span>
            </div>
          </div>
          {formatTimePreview() && (
            <p className="text-sm text-muted-foreground text-center">
              Čas: <span className="font-mono font-medium">{formatTimePreview()}</span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Poznámky (volitelné)</Label>
          <Textarea
            placeholder="Poznámky k výkonu..."
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
              {isPR ? <Trophy className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {isPR ? 'Nový PR!' : 'Uloženo!'}
            </>
          ) : (
            'Uložit výkon'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
