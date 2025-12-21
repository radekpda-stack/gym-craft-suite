import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { featureTracker } from './useFeatureTracking';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  is_completed: boolean;
  is_notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReminderData {
  title: string;
  description?: string;
  remind_at: string;
}

export interface UpdateReminderData {
  title?: string;
  description?: string;
  remind_at?: string;
  is_completed?: boolean;
  is_notified?: boolean;
}

export const useReminders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('remind_at', { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
};

export const useUpcomingReminders = (limit = 5) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reminders', 'upcoming', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_completed', false)
        .gte('remind_at', new Date().toISOString())
        .order('remind_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
};

export const useDueReminders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reminders', 'due', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_completed', false)
        .eq('is_notified', false)
        .lte('remind_at', new Date().toISOString())
        .order('remind_at', { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Check every minute
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateReminderData) => {
      if (!user) throw new Error('User not authenticated');

      const { data: reminder, error } = await supabase
        .from('reminders')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return reminder as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      featureTracker.track('reminder_create', 'reminders');
      toast.success('Připomínka vytvořena');
    },
    onError: (error) => {
      console.error('Error creating reminder:', error);
      toast.error('Nepodařilo se vytvořit připomínku');
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateReminderData }) => {
      const { data: reminder, error } = await supabase
        .from('reminders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return reminder as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      featureTracker.track('reminder_update', 'reminders');
    },
    onError: (error) => {
      console.error('Error updating reminder:', error);
      toast.error('Nepodařilo se aktualizovat připomínku');
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      featureTracker.track('reminder_delete', 'reminders');
      toast.success('Připomínka smazána');
    },
    onError: (error) => {
      console.error('Error deleting reminder:', error);
      toast.error('Nepodařilo se smazat připomínku');
    },
  });
};

export const useCompleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: reminder, error } = await supabase
        .from('reminders')
        .update({ is_completed: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return reminder as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      featureTracker.track('reminder_complete', 'reminders');
      toast.success('Připomínka dokončena');
    },
    onError: (error) => {
      console.error('Error completing reminder:', error);
      toast.error('Nepodařilo se dokončit připomínku');
    },
  });
};

export const useMarkReminderNotified = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .update({ is_notified: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};
