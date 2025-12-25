import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';
import { toast } from './use-toast';

export interface PortalClient {
  id: string;
  client_id: string;
  user_id: string;
  is_active: boolean;
  last_portal_login: string | null;
  created_at: string;
  portal_settings: Record<string, boolean> | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface PortalStats {
  totalClients: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  avgVisitsPerClient: number;
}

export interface PortalVisibilitySettings {
  progress: boolean;
  attendance: boolean;
  credit: boolean;
  nutrition: boolean;
  profile: boolean;
}

const DEFAULT_VISIBILITY: PortalVisibilitySettings = {
  progress: true,
  attendance: true,
  credit: true,
  nutrition: true,
  profile: true,
};

// Fetch all clients with portal access
export function usePortalClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portal-clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('client_accounts')
        .select(`
          id,
          client_id,
          user_id,
          is_active,
          last_portal_login,
          created_at,
          portal_settings,
          client:clients(id, name, email, phone)
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PortalClient[];
    },
    enabled: !!user?.id,
  });
}

// Fetch portal usage statistics
export function usePortalStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portal-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get all portal clients
      const { data: clients, error: clientsError } = await supabase
        .from('client_accounts')
        .select('id, client_id, last_portal_login')
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      if (clientsError) throw clientsError;

      const clientIds = (clients || []).map(c => c.client_id);

      // Get activity counts
      const { data: todayActivity } = await supabase
        .from('client_portal_activity')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('activity_date', todayStart);

      const { data: weekActivity } = await supabase
        .from('client_portal_activity')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('activity_date', weekStart);

      const { data: monthActivity } = await supabase
        .from('client_portal_activity')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('activity_date', monthStart);

      const uniqueToday = new Set(todayActivity?.map(a => a.client_id) || []).size;
      const uniqueWeek = new Set(weekActivity?.map(a => a.client_id) || []).size;
      const uniqueMonth = new Set(monthActivity?.map(a => a.client_id) || []).size;

      const stats: PortalStats = {
        totalClients: clients?.length || 0,
        activeToday: uniqueToday,
        activeThisWeek: uniqueWeek,
        activeThisMonth: uniqueMonth,
        avgVisitsPerClient: clients?.length ? (monthActivity?.length || 0) / clients.length : 0,
      };

      return stats;
    },
    enabled: !!user?.id,
  });
}

// Fetch recent activity
export function usePortalRecentActivity(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portal-recent-activity', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get client IDs for this trainer
      const { data: accounts } = await supabase
        .from('client_accounts')
        .select('client_id')
        .eq('trainer_id', user.id);

      const clientIds = (accounts || []).map(a => a.client_id);
      if (clientIds.length === 0) return [];

      const { data, error } = await supabase
        .from('client_portal_activity')
        .select(`
          id,
          client_id,
          activity_type,
          activity_date,
          metadata,
          client:clients(name)
        `)
        .in('client_id', clientIds)
        .order('activity_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// Fetch clients without portal access (for inviting)
export function useClientsWithoutPortal() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['clients-without-portal', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get clients with portal access
      const { data: portalClients } = await supabase
        .from('client_accounts')
        .select('client_id')
        .eq('trainer_id', user.id);

      const portalClientIds = (portalClients || []).map(c => c.client_id);

      // Get all clients not in portal
      let query = supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (portalClientIds.length > 0) {
        query = query.not('id', 'in', `(${portalClientIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// Invite client to portal
export function useInviteClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get client email
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('email, name')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      if (!client?.email) throw new Error('Klient nemá email');

      // Check if auth user exists for this email
      // If not, we need to create a magic link invitation
      // For now, create a client_access_token for magic link
      const { data: token, error: tokenError } = await supabase
        .from('client_access_tokens')
        .insert({
          client_id: clientId,
          trainer_id: user.id,
          purpose: 'portal_invite',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      return { client, token };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-without-portal'] });
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      toast({
        title: 'Pozvánka vytvořena',
        description: 'Zkopírujte odkaz a pošlete ho klientovi.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Toggle client portal access
export function useToggleClientAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, isActive }: { accountId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('client_accounts')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['portal-clients'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
      toast({
        title: isActive ? 'Přístup aktivován' : 'Přístup deaktivován',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se změnit přístup.',
        variant: 'destructive',
      });
    },
  });
}

// Get/Set portal visibility settings (trainer-level)
export function usePortalVisibilitySettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portal-visibility-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_VISIBILITY;

      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'portal_visibility')
        .maybeSingle();

      if (error) throw error;
      return (data?.value as unknown as PortalVisibilitySettings) || DEFAULT_VISIBILITY;
    },
    enabled: !!user?.id,
  });
}

export function useUpdatePortalVisibility() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PortalVisibilitySettings) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if setting exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('key', 'portal_visibility')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({
            value: settings as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({
            user_id: user.id,
            key: 'portal_visibility',
            value: settings as unknown as Json,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-visibility-settings'] });
      toast({
        title: 'Nastavení uloženo',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se uložit nastavení.',
        variant: 'destructive',
      });
    },
  });
}
