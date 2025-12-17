import { useEffect } from 'react';
import { useDueReminders, useMarkReminderNotified } from '@/hooks/useReminders';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

export const ReminderNotifier = () => {
  const { user } = useAuth();
  const { data: dueReminders } = useDueReminders();
  const markNotified = useMarkReminderNotified();

  useEffect(() => {
    if (!dueReminders || !user) return;

    dueReminders.forEach(async (reminder) => {
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'reminder',
        title: 'Připomínka',
        message: reminder.title,
        entity_type: 'reminder',
        entity_id: reminder.id,
        severity: 'info',
      });

      // Mark as notified
      await markNotified.mutateAsync(reminder.id);

      // Show toast notification
      toast(reminder.title, {
        description: reminder.description || 'Čas na připomínku!',
        icon: <Bell className="h-4 w-4 text-primary" />,
        duration: 10000,
      });
    });
  }, [dueReminders, user, markNotified]);

  return null;
};
