import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreateReminder } from '@/hooks/useReminders';
import { format, addHours, addDays, setHours, setMinutes, startOfTomorrow } from 'date-fns';
import { Clock, Calendar, Bell, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_OPTIONS = [
  { label: '1h', fullLabel: 'Za hodinu', getValue: () => addHours(new Date(), 1) },
  { label: '3h', fullLabel: 'Za 3 hodiny', getValue: () => addHours(new Date(), 3) },
  { label: 'Ráno', fullLabel: 'Zítra ráno', getValue: () => setHours(setMinutes(startOfTomorrow(), 0), 9) },
  { label: 'Odpol.', fullLabel: 'Zítra odpoledne', getValue: () => setHours(setMinutes(startOfTomorrow(), 0), 14) },
  { label: 'Týden', fullLabel: 'Za týden', getValue: () => addDays(new Date(), 7) },
];

export const CreateReminderDialog = ({ open, onOpenChange }: CreateReminderDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(true);
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);
  const createReminder = useCreateReminder();

  const handleQuickOption = (option: typeof QUICK_OPTIONS[0]) => {
    const date = option.getValue();
    setRemindAt(format(date, "yyyy-MM-dd'T'HH:mm"));
    setSelectedQuick(option.label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;

    await createReminder.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      remind_at: new Date(remindAt).toISOString(),
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setRemindAt('');
    setSelectedQuick(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 liquid-glass p-0 overflow-hidden">
        {/* iOS-style header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-lg">Nová připomínka</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSubmit}
            disabled={!title.trim() || !remindAt || createReminder.isPending}
            className="h-9 w-9 rounded-full hover:bg-white/10 text-blue-400 disabled:text-muted-foreground"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Title input - iOS style */}
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Co si chcete připomenout?"
              autoFocus
              className="h-14 text-lg rounded-2xl border-0 bg-white/5 px-4 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Poznámka..."
              rows={2}
              className="rounded-2xl border-0 bg-white/5 px-4 py-3 resize-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Date toggle row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20">
                <Calendar className="h-5 w-5 text-red-400" />
              </div>
              <span className="font-medium">Datum a čas</span>
            </div>
            <Switch
              checked={showDatePicker}
              onCheckedChange={setShowDatePicker}
            />
          </div>

          {/* Date/Time picker section */}
          {showDatePicker && (
            <div className="space-y-4 animate-fade-in">
              {/* Quick options */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleQuickOption(option)}
                    className={cn(
                      'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                      selectedQuick === option.label
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-muted-foreground hover:bg-white/15'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Datetime input */}
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={remindAt}
                  onChange={(e) => {
                    setRemindAt(e.target.value);
                    setSelectedQuick(null);
                  }}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  className="h-14 pl-12 rounded-2xl border-0 bg-white/5"
                />
              </div>

              {/* Selected time preview */}
              {remindAt && (
                <div className="text-center text-sm text-muted-foreground">
                  <Bell className="inline-block w-4 h-4 mr-1.5" />
                  Připomenu: {format(new Date(remindAt), 'd. MMMM yyyy v HH:mm')}
                </div>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
