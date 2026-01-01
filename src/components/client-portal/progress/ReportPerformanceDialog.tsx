import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Timer, Calendar, Trophy, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseTimeToMs } from '@/lib/timeUtils';

interface ReportPerformanceDialogProps {
  trigger?: React.ReactNode;
}

const EXERCISE_OPTIONS = [
  { name: 'Veslo 500m', category: 'cardio', distance: 500 },
  { name: 'Veslo 1000m', category: 'cardio', distance: 1000 },
  { name: 'Veslo 2000m', category: 'cardio', distance: 2000 },
  { name: 'SkiErg 500m', category: 'cardio', distance: 500 },
  { name: 'SkiErg 1000m', category: 'cardio', distance: 1000 },
  { name: 'Běh 500m', category: 'cardio', distance: 500 },
  { name: 'Běh 1000m', category: 'cardio', distance: 1000 },
  { name: 'Běh 5km', category: 'cardio', distance: 5000 },
];

export function ReportPerformanceDialog({ trigger }: ReportPerformanceDialogProps) {
  const { clientId, user, clientAccount } = useClientPortal();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeInput, setTimeInput] = useState('');
  const [notes, setNotes] = useState('');

  const submitPerformance = useMutation({
    mutationFn: async () => {
      if (!clientId || !clientAccount?.trainer_id) {
        throw new Error('Klient není přihlášen');
      }

      const selectedExercise = EXERCISE_OPTIONS.find(e => e.name === exerciseName);
      if (!selectedExercise) {
        throw new Error('Vyberte cvik');
      }

      const timeMs = parseTimeToMs(timeInput);
      if (!timeMs) {
        throw new Error('Zadejte platný čas (mm:ss nebo mm:ss.SS)');
      }

      // Find exercise_id by matching name
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, name_cs')
        .or(`name.ilike.%${selectedExercise.name.split(' ')[0]}%,name_cs.ilike.%${selectedExercise.name.split(' ')[0]}%`)
        .limit(1);

      const exerciseId = exercises?.[0]?.id || null;

      // Insert as pending (client_self_report)
      const { data, error } = await supabase
        .from('exercise_entries')
        .insert({
          user_id: clientAccount.trainer_id, // Owner is the trainer
          client_id: clientId,
          exercise_id: exerciseId,
          exercise_name: selectedExercise.name,
          date,
          sets: 1,
          time_ms: timeMs,
          time_seconds: Math.round(timeMs / 1000),
          distance_meters: selectedExercise.distance,
          notes: notes || null,
          is_test: true,
          source: 'client_self_report',
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Performance report error:', error);
        throw new Error(error.message || 'Nepodařilo se nahlásit výkon');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-cardio-progress'] });
      queryClient.invalidateQueries({ queryKey: ['pending-performances'] });
      toast.success('Výkon nahlášen ke schválení');
      setOpen(false);
      setTimeInput('');
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nepodařilo se nahlásit výkon');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPerformance.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            Nahlásit výkon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Nahlásit výkon
          </DialogTitle>
          <DialogDescription>
            Nahlas svůj výkon mimo trénink. Trenér ho potvrdí.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Výkon bude čekat na schválení trenérem před započítáním do statistik.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cvik</Label>
            <Select value={exerciseName} onValueChange={setExerciseName}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte cvik" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_OPTIONS.map(opt => (
                  <SelectItem key={opt.name} value={opt.name}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Datum</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10"
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Čas (mm:ss nebo mm:ss.SS)</Label>
            <div className="relative">
              <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="1:41.35"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Např. 1:41 nebo 1:41.35 pro čas s desetinami
            </p>
          </div>

          <div className="space-y-2">
            <Label>Poznámka (volitelné)</Label>
            <Textarea
              placeholder="Např. po rozcvičení, max tempo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={submitPerformance.isPending || !exerciseName || !timeInput}>
              {submitPerformance.isPending ? 'Odesílám...' : 'Nahlásit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
