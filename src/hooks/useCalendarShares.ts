import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CalendarShare {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

// Získání sdílení, která jsem vytvořil (komu sdílím svůj kalendář)
export function useMyCalendarShares() {
  return useQuery({
    queryKey: ['calendar-shares', 'mine'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('calendar_shares')
        .select('*')
        .eq('owner_user_id', user.id);

      if (error) throw error;
      return data as CalendarShare[];
    }
  });
}

// Získání sdílení, která mám přijata (kdo mi sdílí svůj kalendář)
export function useSharedWithMe() {
  return useQuery({
    queryKey: ['calendar-shares', 'shared-with-me'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('calendar_shares')
        .select('*')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      return data as CalendarShare[];
    }
  });
}

// Získání nevyřízených pozvánek
export function usePendingInvitations() {
  return useQuery({
    queryKey: ['calendar-shares', 'pending'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('calendar_shares')
        .select('*')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data as CalendarShare[];
    }
  });
}

// Vytvoření pozvánky ke sdílení
export function useCreateCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sharedWithEmail: string) => {
      // Nejprve najdeme uživatele podle emailu (pokud máme profily)
      // Pro teď použijeme přímo user_id - uživatel ho musí znát
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Tady bychom mohli hledat uživatele podle emailu
      // Pro jednoduchost předpokládáme, že předáváme přímo user_id
      const { data, error } = await supabase
        .from('calendar_shares')
        .insert({
          owner_user_id: user.id,
          shared_with_user_id: sharedWithEmail, // TODO: změnit na lookup podle emailu
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
      toast.success('Pozvánka ke sdílení odeslána');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nepodařilo se odeslat pozvánku');
    }
  });
}

// Odpověď na pozvánku
export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { data, error } = await supabase
        .from('calendar_shares')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
      toast.success(accept ? 'Pozvánka přijata' : 'Pozvánka odmítnuta');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nepodařilo se odpovědět na pozvánku');
    }
  });
}

// Smazání sdílení
export function useDeleteCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calendar_shares')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
      toast.success('Sdílení zrušeno');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nepodařilo se zrušit sdílení');
    }
  });
}
