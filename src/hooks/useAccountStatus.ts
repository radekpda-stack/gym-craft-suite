import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type SubscriptionType = 'free' | 'trial' | 'paid';

export interface AccountProfile {
  id: string;
  email: string;
  display_name: string | null;
  account_status: AccountStatus;
  subscription_type: SubscriptionType;
  trial_until: string | null;
  client_limit: number;
  first_login_at: string | null;
  last_login_at: string | null;
}

export function useAccountStatus() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['account-status', user?.id],
    queryFn: async (): Promise<AccountProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, account_status, subscription_type, trial_until, client_limit, first_login_at, last_login_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching account status:', error);
        return null;
      }

      return data as AccountProfile;
    },
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  });

  return {
    ...query,
    isApproved: query.data?.account_status === 'approved',
    isPending: query.data?.account_status === 'pending',
    isRejected: query.data?.account_status === 'rejected',
    isSuspended: query.data?.account_status === 'suspended',
    accountStatus: query.data?.account_status,
    subscriptionType: query.data?.subscription_type,
    clientLimit: query.data?.client_limit ?? 5,
  };
}
