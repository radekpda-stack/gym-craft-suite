import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Reminder, useUpdateReminder } from '@/hooks/useReminders';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

interface EditReminderDialogProps {
  reminder: Reminder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditReminderDialog = ({ reminder, open, onOpenChange }: EditReminderDialogProps) => {
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [remindAt, setRemindAt] = useState('');
  const updateReminder = useUpdateReminder();

  useEffect(() => {
    setTitle(reminder.title);
    setDescription(reminder.description || '');
    setRemindAt(format(new Date(reminder.remind_at), "yyyy-MM-dd'T'HH:mm"));
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    await updateReminder.mutateAsync({
      id: reminder.id,
      data: {
        title: title.trim(),
        description: description.trim() || undefined,
        remind_at: new Date(remindAt).toISOString(),
      },
    });

    toast.success('Připomínka aktualizována');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upravit připomínku
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Název *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co si chcete připomenout?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Poznámka</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Doplňující informace..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-remindAt">Datum a čas připomínky *</Label>
            <Input
              id="edit-remindAt"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || !remindAt || updateReminder.isPending}
            >
              {updateReminder.isPending ? 'Ukládám...' : 'Uložit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
