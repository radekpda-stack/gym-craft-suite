import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RxWorkout, useRxWorkoutToChallenge } from '@/hooks/useRxWorkouts';
import { Loader2, Trophy } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface CreateChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: RxWorkout;
}

export function CreateChallengeDialog({ 
  open, 
  onOpenChange, 
  workout 
}: CreateChallengeDialogProps) {
  const today = new Date();
  const nextWeek = addDays(today, 7);
  
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(nextWeek, 'yyyy-MM-dd'));
  
  const createChallenge = useRxWorkoutToChallenge();

  const handleCreate = async () => {
    try {
      await createChallenge.mutateAsync({
        workoutId: workout.id,
        startAt: new Date(startDate).toISOString(),
        endAt: new Date(endDate + 'T23:59:59').toISOString(),
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Vytvořit výzvu z RX Workoutu
          </DialogTitle>
          <DialogDescription>
            Vytvořte soutěžní výzvu z workoutu "{workout.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Datum začátku</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">Datum konce</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={createChallenge.isPending}
          >
            {createChallenge.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Vytvořit výzvu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
