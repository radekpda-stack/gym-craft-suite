import { useState } from 'react';
import { toLocalISOString } from '@/utils/dateUtils';
import { Repeat, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { cs } from 'date-fns/locale';

interface RepeatTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    client_id: string;
    date: string;
    duration: number;
    notes: string;
    participant_count: number;
    training_type?: string | null;
  };
  clientName: string;
}

type RecurrenceType = 'weekly' | 'biweekly' | 'monthly';

function generateRecurringDates(
  startDate: Date,
  recurrenceType: RecurrenceType,
  count: number
): Date[] {
  const dates: Date[] = [];
  let currentDate = startDate;

  for (let i = 0; i < count; i++) {
    switch (recurrenceType) {
      case 'weekly':
        currentDate = addWeeks(startDate, i + 1);
        break;
      case 'biweekly':
        currentDate = addWeeks(startDate, (i + 1) * 2);
        break;
      case 'monthly':
        currentDate = addMonths(startDate, i + 1);
        break;
    }
    dates.push(currentDate);
  }

  return dates;
}

export function RepeatTrainingDialog({
  open,
  onOpenChange,
  session,
  clientName,
}: RepeatTrainingDialogProps) {
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (recurrenceCount < 1 || recurrenceCount > 52) {
      toast.error('Počet opakování musí být mezi 1 a 52');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Uživatel není přihlášen');

      const startDate = new Date(session.date);
      const futureDates = generateRecurringDates(startDate, recurrenceType, recurrenceCount);

      // Create child sessions
      const childSessions = futureDates.map(date => ({
        client_id: session.client_id,
        date: toLocalISOString(date.toString()),
        duration: session.duration,
        notes: session.notes || '',
        status: 'scheduled' as const,
        participant_count: session.participant_count || 1,
        parent_session_id: session.id,
        user_id: user.id,
        training_type: session.training_type || null,
      }));

      const { data: createdSessions, error } = await supabase
        .from('training_sessions')
        .insert(childSessions)
        .select('id');

      if (error) throw error;

      // Add primary client as participant for each created session
      if (createdSessions && createdSessions.length > 0) {
        const participants = createdSessions.map(s => ({
          training_session_id: s.id,
          client_id: session.client_id,
          price_share: 0,
          user_id: user.id,
        }));

        await supabase.from('training_participants').insert(participants);
      }

      // Update parent session with recurrence info
      await supabase
        .from('training_sessions')
        .update({
          recurrence_type: recurrenceType,
          recurrence_end_date: futureDates[futureDates.length - 1].toISOString(),
        })
        .eq('id', session.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['training-sessions'] });

      toast.success(`Vytvořeno ${createdSessions?.length || 0} opakujících se tréninků`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      toast.error('Chyba při vytváření opakujících se tréninků');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRecurrenceLabel = () => {
    switch (recurrenceType) {
      case 'weekly': return 'Každý týden';
      case 'biweekly': return 'Každé 2 týdny';
      case 'monthly': return 'Každý měsíc';
    }
  };

  const previewDates = generateRecurringDates(
    new Date(session.date),
    recurrenceType,
    Math.min(recurrenceCount, 3)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Opakovat trénink
          </DialogTitle>
          <DialogDescription>
            Vytvořte opakující se tréninky pro {clientName} na základě tohoto tréninku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source training info */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-sm text-muted-foreground">Výchozí trénink:</p>
            <p className="font-medium">
              {format(new Date(session.date), "EEEE d.M. 'v' HH:mm", { locale: cs })}
            </p>
          </div>

          {/* Recurrence type */}
          <div className="space-y-2">
            <Label>Frekvence opakování</Label>
            <Select
              value={recurrenceType}
              onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Každý týden</SelectItem>
                <SelectItem value="biweekly">Každé 2 týdny</SelectItem>
                <SelectItem value="monthly">Každý měsíc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recurrence count */}
          <div className="space-y-2">
            <Label>Počet opakování</Label>
            <Input
              type="number"
              min={1}
              max={52}
              value={recurrenceCount}
              onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              Vytvoří {recurrenceCount} nových tréninků ({getRecurrenceLabel().toLowerCase()})
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Náhled termínů:</Label>
            <div className="space-y-1 text-sm">
              {previewDates.map((date, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{format(date, "EEEE d.M. 'v' HH:mm", { locale: cs })}</span>
                </div>
              ))}
              {recurrenceCount > 3 && (
                <p className="text-muted-foreground">... a {recurrenceCount - 3} dalších</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Vytvořit {recurrenceCount} tréninků
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
