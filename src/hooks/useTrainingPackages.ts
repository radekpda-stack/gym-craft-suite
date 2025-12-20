import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingPackage {
  id: string;
  name: string;
  description: string | null;
  training_count: number;
  price: number;
  validity_days: number | null;
  is_active: boolean;
  user_id: string;
  created_at: string;
}

export interface CreatePackageInput {
  name: string;
  description?: string;
  training_count: number;
  price: number;
  validity_days?: number;
}

export function useTrainingPackages() {
  return useQuery({
    queryKey: ['training-packages'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_packages')
        .select('*')
        .eq('user_id', user.id)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as TrainingPackage[];
    },
  });
}

export function useCreateTrainingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('training_packages')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-packages'] });
      toast.success('Balíček vytvořen');
    },
    onError: (error) => {
      toast.error('Chyba při vytváření balíčku');
      console.error(error);
    },
  });
}

export function useUpdateTrainingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingPackage> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-packages'] });
      toast.success('Balíček aktualizován');
    },
    onError: (error) => {
      toast.error('Chyba při aktualizaci balíčku');
      console.error(error);
    },
  });
}

export function useDeleteTrainingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-packages'] });
      toast.success('Balíček smazán');
    },
    onError: (error) => {
      toast.error('Chyba při mazání balíčku');
      console.error(error);
    },
  });
}
