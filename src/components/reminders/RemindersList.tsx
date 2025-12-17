import { useState } from 'react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check, Trash2, Clock, Bell, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Reminder, useCompleteReminder, useDeleteReminder } from '@/hooks/useReminders';
import { cn } from '@/lib/utils';
import { EditReminderDialog } from './EditReminderDialog';

interface RemindersListProps {
  reminders: Reminder[];
  showCompleted?: boolean;
}

export const RemindersList = ({ reminders, showCompleted = false }: RemindersListProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();

  const filteredReminders = showCompleted 
    ? reminders 
    : reminders.filter(r => !r.is_completed);

  const formatRemindAt = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return `Dnes v ${format(date, 'HH:mm')}`;
    }
    if (isTomorrow(date)) {
      return `Zítra v ${format(date, 'HH:mm')}`;
    }
    return format(date, 'd. MMMM yyyy HH:mm', { locale: cs });
  };

  const getStatusBadge = (reminder: Reminder) => {
    if (reminder.is_completed) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Dokončeno</Badge>;
    }
    const remindDate = new Date(reminder.remind_at);
    if (isPast(remindDate)) {
      return <Badge variant="destructive">Zmeškáno</Badge>;
    }
    if (isToday(remindDate)) {
      return <Badge className="bg-primary/20 text-primary">Dnes</Badge>;
    }
    return null;
  };

  const handleComplete = async (id: string) => {
    await completeReminder.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteReminder.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (filteredReminders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Žádné připomínky</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {filteredReminders.map((reminder) => {
          const isPastDue = isPast(new Date(reminder.remind_at)) && !reminder.is_completed;
          
          return (
            <Card 
              key={reminder.id}
              className={cn(
                "transition-all",
                reminder.is_completed && "opacity-60",
                isPastDue && "border-destructive/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={reminder.is_completed}
                    onCheckedChange={() => !reminder.is_completed && handleComplete(reminder.id)}
                    disabled={reminder.is_completed}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={cn(
                        "font-medium",
                        reminder.is_completed && "line-through text-muted-foreground"
                      )}>
                        {reminder.title}
                      </h3>
                      {getStatusBadge(reminder)}
                    </div>
                    
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {reminder.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className={cn(isPastDue && "text-destructive")}>
                        {formatRemindAt(reminder.remind_at)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditReminder(reminder)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat připomínku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Připomínka bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editReminder && (
        <EditReminderDialog
          reminder={editReminder}
          open={!!editReminder}
          onOpenChange={(open) => !open && setEditReminder(null)}
        />
      )}
    </>
  );
};
