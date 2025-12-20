import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
}

export interface CalendarShare {
  id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  ownerProfile?: Profile | null;
  sharedWithProfile?: Profile | null;
}

// Helper to fetch profiles for shares
async function enrichSharesWithProfiles(shares: any[]): Promise<CalendarShare[]> {
  if (shares.length === 0) return [];
  
  const userIds = new Set<string>();
  shares.forEach(s => {
    userIds.add(s.owner_user_id);
    userIds.add(s.shared_with_user_id);
  });
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', Array.from(userIds));
  
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  
  return shares.map(share => ({
    ...share,
    ownerProfile: profileMap.get(share.owner_user_id) || null,
    sharedWithProfile: profileMap.get(share.shared_with_user_id) || null,
  }));
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
      return enrichSharesWithProfiles(data || []);
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
      return enrichSharesWithProfiles(data || []);
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
      return enrichSharesWithProfiles(data || []);
    }
  });
}

// Vytvoření pozvánky ke sdílení - vyhledá uživatele podle emailu
export function useCreateCalendarShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Lookup user by email in profiles table
      const { data: targetUser, error: lookupError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!targetUser) throw new Error('Uživatel s tímto emailem nebyl nalezen');
      if (targetUser.id === user.id) throw new Error('Nemůžete sdílet kalendář sami sobě');

      // Check if share already exists
      const { data: existingShare } = await supabase
        .from('calendar_shares')
        .select('id')
        .eq('owner_user_id', user.id)
        .eq('shared_with_user_id', targetUser.id)
        .maybeSingle();

      if (existingShare) throw new Error('Tomuto uživateli již kalendář sdílíte');

      const { data, error } = await supabase
        .from('calendar_shares')
        .insert({
          owner_user_id: user.id,
          shared_with_user_id: targetUser.id,
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
