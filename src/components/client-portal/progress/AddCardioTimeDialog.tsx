import { useState } from 'react';
import { format } from 'date-fns';
import { Timer, Calendar, Plus } from 'lucide-react';
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
import { useClientAddCardio } from '@/hooks/useClientAddMeasurement';
import { toast } from 'sonner';

interface AddCardioTimeDialogProps {
  defaultExercise?: string;
  defaultDistance?: number;
  trigger?: React.ReactNode;
}

const CARDIO_OPTIONS = [
  { name: 'Veslo', distances: [500, 1000, 2000] },
  { name: 'Běh', distances: [500, 1000, 5000] },
];

export function AddCardioTimeDialog({ 
  defaultExercise = 'Veslo',
  defaultDistance = 500,
  trigger 
}: AddCardioTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [exercise, setExercise] = useState(defaultExercise);
  const [distance, setDistance] = useState(defaultDistance);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [notes, setNotes] = useState('');

  const addCardio = useClientAddCardio();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mins = parseInt(minutes) || 0;
    const secs = parseInt(seconds) || 0;
    const totalSeconds = mins * 60 + secs;

    if (totalSeconds <= 0) {
      toast.error('Zadej platný čas');
      return;
    }

    try {
      await addCardio.mutateAsync({
        date,
        exercise_name: exercise,
        duration_seconds: totalSeconds,
        distance_meters: distance,
        notes: notes || undefined,
      });

      toast.success('Čas přidán');
      setOpen(false);
      setMinutes('');
      setSeconds('');
      setNotes('');
    } catch (error) {
      toast.error('Nepodařilo se přidat záznam');
    }
  };

  const selectedExercise = CARDIO_OPTIONS.find(e => e.name === exercise);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Timer className="w-4 h-4" />
            Zapsat čas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Zapsat kardio čas
          </DialogTitle>
          <DialogDescription>
            Zaznamenej svůj nejlepší čas pro srovnání.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cvičení</Label>
              <Select value={exercise} onValueChange={setExercise}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARDIO_OPTIONS.map(opt => (
                    <SelectItem key={opt.name} value={opt.name}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vzdálenost</Label>
              <Select 
                value={String(distance)} 
                onValueChange={(v) => setDistance(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedExercise?.distances.map(d => (
                    <SelectItem key={d} value={String(d)}>
                      {d >= 1000 ? `${d / 1000} km` : `${d} m`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Čas (mm:ss)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="min"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="text-center"
              />
              <span className="text-xl font-medium text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="sec"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                className="text-center"
              />
            </div>
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
            <Button type="submit" disabled={addCardio.isPending}>
              {addCardio.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
