import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

export interface ClientPackage {
  id: string;
  client_id: string;
  package_id: string | null;
  package_name: string;
  purchased_at: string;
  expires_at: string | null;
  trainings_total: number;
  trainings_used: number;
  price_paid: number;
  is_active: boolean;
  notes: string | null;
  user_id: string;
}

export interface PurchasePackageInput {
  client_id: string;
  package_id?: string;
  package_name: string;
  trainings_total: number;
  price_paid: number;
  validity_days?: number;
  notes?: string;
}

export function useClientPackages(clientId?: string) {
  return useQuery({
    queryKey: ['client-packages', clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('client_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientPackage[];
    },
    enabled: true,
  });
}

export function useActiveClientPackage(clientId?: string) {
  return useQuery({
    queryKey: ['client-package-active', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('client_packages')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('purchased_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ClientPackage | null;
    },
    enabled: !!clientId,
  });
}

export function usePurchasePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PurchasePackageInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const expiresAt = input.validity_days 
        ? addDays(new Date(), input.validity_days).toISOString()
        : null;

      const { data, error } = await supabase
        .from('client_packages')
        .insert({
          client_id: input.client_id,
          package_id: input.package_id,
          package_name: input.package_name,
          trainings_total: input.trainings_total,
          price_paid: input.price_paid,
          expires_at: expiresAt,
          notes: input.notes,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-packages'] });
      queryClient.invalidateQueries({ queryKey: ['client-package-active', variables.client_id] });
      toast.success('Balíček přiřazen klientovi');
    },
    onError: (error) => {
      toast.error('Chyba při přiřazení balíčku');
      console.error(error);
    },
  });
}

export function useUsePackageTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, clientId }: { packageId: string; clientId: string }) => {
      const { data: pkg, error: fetchError } = await supabase
        .from('client_packages')
        .select('trainings_used, trainings_total')
        .eq('id', packageId)
        .single();

      if (fetchError) throw fetchError;

      const newUsed = (pkg.trainings_used || 0) + 1;
      const isActive = newUsed < pkg.trainings_total;

      const { error } = await supabase
        .from('client_packages')
        .update({ 
          trainings_used: newUsed,
          is_active: isActive,
        })
        .eq('id', packageId);

      if (error) throw error;
      return { newUsed, isActive };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-packages'] });
      queryClient.invalidateQueries({ queryKey: ['client-package-active', variables.clientId] });
    },
  });
}

export function useDeactivatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await supabase
        .from('client_packages')
        .update({ is_active: false })
        .eq('id', packageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-packages'] });
      queryClient.invalidateQueries({ queryKey: ['client-package-active'] });
      toast.success('Balíček deaktivován');
    },
  });
}
