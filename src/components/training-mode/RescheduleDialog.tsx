import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarClock, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { toast } from 'sonner';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentDate: string;
  clientName: string;
  onSuccess?: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  sessionId,
  currentDate,
  clientName,
  onSuccess,
}: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState<Date>(new Date(currentDate));
  const updateSession = useUpdateTrainingSession();

  const handleConfirm = async () => {
    try {
      await updateSession.mutateAsync({
        id: sessionId,
        input: {
          date: newDate.toISOString(),
        },
      });
      toast.success('Trénink přesunut');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Chyba při přesouvání tréninku');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Přesunout termín
          </DialogTitle>
          <DialogDescription>
            Vyberte nový datum a čas pro trénink s {clientName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aktuální termín:</span>
              <span className="font-medium">
                {format(new Date(currentDate), "EEEE d.M. 'v' HH:mm", { locale: cs })}
              </span>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Nový termín:</label>
            <DateTimePicker
              value={newDate}
              onChange={(d) => setNewDate(typeof d === 'string' ? new Date(d) : d as Date)}
              returnString={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={updateSession.isPending}
          >
            {updateSession.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Přesunout na {format(newDate, "d.M. HH:mm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
