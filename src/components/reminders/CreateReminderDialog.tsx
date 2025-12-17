import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateReminder } from '@/hooks/useReminders';
import { format, addHours, addDays, setHours, setMinutes, startOfTomorrow } from 'date-fns';
import { Clock, Calendar } from 'lucide-react';

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_OPTIONS = [
  { label: 'Za 1 hodinu', getValue: () => addHours(new Date(), 1) },
  { label: 'Za 3 hodiny', getValue: () => addHours(new Date(), 3) },
  { label: 'Zítra ráno', getValue: () => setHours(setMinutes(startOfTomorrow(), 0), 9) },
  { label: 'Zítra odpoledne', getValue: () => setHours(setMinutes(startOfTomorrow(), 0), 14) },
  { label: 'Za týden', getValue: () => addDays(new Date(), 7) },
];

export const CreateReminderDialog = ({ open, onOpenChange }: CreateReminderDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const createReminder = useCreateReminder();

  const handleQuickOption = (getValue: () => Date) => {
    const date = getValue();
    setRemindAt(format(date, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    await createReminder.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      remind_at: new Date(remindAt).toISOString(),
    });

    setTitle('');
    setDescription('');
    setRemindAt('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setRemindAt('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Nová připomínka
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Název *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co si chcete připomenout?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Poznámka</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Doplňující informace..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Rychlý výběr času</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickOption(option.getValue)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remindAt" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datum a čas připomínky *
            </Label>
            <Input
              id="remindAt"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Zrušit
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || !remindAt || createReminder.isPending}
            >
              {createReminder.isPending ? 'Ukládám...' : 'Vytvořit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
