import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccountStatus } from '@/hooks/useAccountStatus';

export function useClientLimit() {
  const { user } = useAuth();
  const { clientLimit } = useAccountStatus();

  const { data: activeClientCount = 0, isLoading } = useQuery({
    queryKey: ['active-client-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (error) {
        console.error('Error counting clients:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user,
  });

  return {
    activeClientCount,
    clientLimit,
    isLoading,
    canAddClient: activeClientCount < clientLimit,
    remainingSlots: Math.max(0, clientLimit - activeClientCount),
  };
}
