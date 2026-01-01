import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MyProfileData {
  clientId: string;
  trainerId: string;
  clientName: string;
}

export function useMyProfile() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async (): Promise<MyProfileData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_self_profile', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        clientId: data.id,
        trainerId: user.id,
        clientName: data.name,
      };
    },
    enabled: !loading && !!user?.id,
  });
}
