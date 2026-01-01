import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MyProfileData {
  clientId: string;
  trainerId: string;
  clientName: string;
}

export function useMyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async (): Promise<MyProfileData | null> => {
      if (!user?.id) return null;

      // Find the client record that belongs to the current user (trainer's own client profile)
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching my profile:', error);
        return null;
      }

      return {
        clientId: data.id,
        trainerId: user.id,
        clientName: data.name,
      };
    },
    enabled: !!user?.id,
  });
}
