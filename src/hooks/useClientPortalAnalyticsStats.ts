import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays, startOfDay, format } from 'date-fns';

export type PortalStatsPeriod = '7d' | '30d' | '90d' | 'all';

export interface PortalActivityStats {
  totalActivities: number;
  uniqueClients: number;
  activityByType: { type: string; count: number; label: string }[];
  activityByClient: { clientId: string; clientName: string; count: number }[];
  dailyActivity: { date: string; count: number; uniqueClients: number }[];
  mostActivePages: { page: string; count: number; label: string }[];
  leastUsedFeatures: { feature: string; count: number; label: string }[];
  averageActivitiesPerClient: number;
  activeClientsPercent: number;
  peakActivityDay: string | null;
  peakActivityCount: number;
  totalPortalClients: number;
}

const ACTIVITY_LABELS: Record<string, string> = {
  'page_view_client_portal_overview': 'Přehled',
  'page_view_client_portal_progress': 'Progres',
  'page_view_client_portal_attendance': 'Docházka',
  'page_view_client_portal_credit': 'Kredit',
  'page_view_client_portal_nutrition': 'Strava',
  'page_view_client_portal_settings': 'Nastavení',
  'page_view_client_portal_challenges': 'Výzvy',
  'page_view_client_portal_leaderboard': 'Žebříček',
  'page_view_client_portal_badges': 'Odznaky',
  'page_view_client_portal_workout_diary': 'Deník tréninků',
  'client_portal_overview': 'Přehled',
  'client_portal_progress': 'Progres',
  'client_portal_attendance': 'Docházka',
  'client_portal_credit': 'Kredit',
  'client_portal_nutrition': 'Strava',
  'client_portal_settings': 'Nastavení',
  'client_portal_challenges': 'Výzvy',
  'client_portal_leaderboard': 'Žebříček',
  'client_portal_badges': 'Odznaky',
  'client_portal_workout_diary': 'Deník tréninků',
  'client_portal_overview_viewed': 'Zobrazení přehledu',
  'client_portal_progress_viewed': 'Zobrazení progresu',
  'client_portal_attendance_viewed': 'Zobrazení docházky',
  'client_portal_credit_viewed': 'Zobrazení kreditu',
  'client_portal_nutrition_viewed': 'Zobrazení stravy',
  'client_portal_challenges_viewed': 'Zobrazení výzev',
  'client_portal_leaderboard_viewed': 'Zobrazení žebříčku',
  'client_portal_badges_viewed': 'Zobrazení odznaků',
  'client_portal_workout_diary_viewed': 'Zobrazení deníku',
  'portal_nutrition_add_food': 'Přidání jídla',
  'portal_nutrition_add_water': 'Přidání vody',
  'portal_nutrition_edit_entry': 'Úprava stravy',
  'portal_nutrition_delete_entry': 'Smazání stravy',
  'portal_challenge_join': 'Přihlášení do výzvy',
  'portal_challenge_submit': 'Odeslání výsledku',
  'portal_challenge_view_detail': 'Detail výzvy',
  'portal_workout_log_create': 'Záznam tréninku',
  'portal_workout_log_edit': 'Úprava záznamu',
  'portal_workout_confirm': 'Potvrzení tréninku',
  'portal_progress_add_measurement': 'Přidání měření',
  'portal_progress_view_chart': 'Zobrazení grafu',
  'portal_progress_view_pr': 'Zobrazení PR',
  'portal_feedback_submit': 'Odeslání feedbacku',
  'portal_feedback_skip': 'Přeskočení feedbacku',
  'portal_settings_change_password': 'Změna hesla',
  'portal_settings_update_profile': 'Aktualizace profilu',
  'portal_settings_toggle_leaderboard': 'Nastavení žebříčku',
  'portal_settings_toggle_notifications': 'Nastavení notifikací',
  'client_portal_login': 'Přihlášení',
  'client_portal_logout': 'Odhlášení',
  'portal_badge_earned': 'Získání odznaku',
  'portal_xp_earned': 'Získání XP',
  'portal_level_up': 'Level up',
};

function getPeriodStartDate(period: PortalStatsPeriod): Date | null {
  switch (period) {
    case '7d':
      return startOfDay(subDays(new Date(), 7));
    case '30d':
      return startOfDay(subDays(new Date(), 30));
    case '90d':
      return startOfDay(subDays(new Date(), 90));
    case 'all':
      return null;
  }
}

function getActivityLabel(type: string): string {
  if (ACTIVITY_LABELS[type]) return ACTIVITY_LABELS[type];
  // Try to parse page view names
  if (type.startsWith('page_view_')) {
    const page = type.replace('page_view_', '').replace(/_/g, ' ');
    return page.charAt(0).toUpperCase() + page.slice(1);
  }
  return type.replace(/_/g, ' ');
}

export function useClientPortalAnalyticsStats(period: PortalStatsPeriod = '30d') {
  const { user } = useAuth();
  const startDate = getPeriodStartDate(period);

  return useQuery({
    queryKey: ['client-portal-analytics-detailed', user?.id, period],
    queryFn: async (): Promise<PortalActivityStats> => {
      if (!user?.id) {
        return getEmptyStats();
      }

      // First get all clients for this trainer
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      const clientMap = new Map<string, string>();
      (clients || []).forEach(c => clientMap.set(c.id, c.name));
      const clientIds = Array.from(clientMap.keys());

      if (clientIds.length === 0) {
        return getEmptyStats();
      }

      // Get clients with portal access
      const { data: portalClients } = await supabase
        .from('client_accounts')
        .select('client_id')
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      const totalPortalClients = portalClients?.length || 0;

      // Get portal activity
      let query = supabase
        .from('client_portal_activity')
        .select('*')
        .in('client_id', clientIds);

      if (startDate) {
        query = query.gte('activity_date', startDate.toISOString().split('T')[0]);
      }

      const { data: activities, error } = await query;
      if (error) throw error;

      const activityList = activities || [];

      // Calculate stats
      const totalActivities = activityList.length;
      const uniqueClientIds = new Set(activityList.map(a => a.client_id));
      const uniqueClients = uniqueClientIds.size;

      // Activity by type
      const typeCount = new Map<string, number>();
      for (const activity of activityList) {
        typeCount.set(activity.activity_type, (typeCount.get(activity.activity_type) || 0) + 1);
      }
      const activityByType = Array.from(typeCount.entries())
        .map(([type, count]) => ({
          type,
          count,
          label: getActivityLabel(type)
        }))
        .sort((a, b) => b.count - a.count);

      // Activity by client
      const clientCount = new Map<string, number>();
      for (const activity of activityList) {
        clientCount.set(activity.client_id, (clientCount.get(activity.client_id) || 0) + 1);
      }
      const activityByClient = Array.from(clientCount.entries())
        .map(([clientId, count]) => ({
          clientId,
          clientName: clientMap.get(clientId) || 'Neznámý',
          count
        }))
        .sort((a, b) => b.count - a.count);

      // Daily activity
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const dailyMap = new Map<string, { count: number; clients: Set<string> }>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
        dailyMap.set(date, { count: 0, clients: new Set() });
      }

      for (const activity of activityList) {
        const date = activity.activity_date;
        if (dailyMap.has(date)) {
          const entry = dailyMap.get(date)!;
          entry.count++;
          entry.clients.add(activity.client_id);
        }
      }

      const dailyActivity = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        uniqueClients: data.clients.size
      }));

      // Most active pages (filter page views only)
      const pageViews = activityByType.filter(a => a.type.startsWith('page_view_'));
      const mostActivePages = pageViews.slice(0, 10).map(p => ({
        page: p.type,
        count: p.count,
        label: p.label
      }));

      // Least used features (non-page-view activities with low count)
      const actionActivities = activityByType.filter(a => !a.type.startsWith('page_view_'));
      const leastUsedFeatures = [...actionActivities]
        .sort((a, b) => a.count - b.count)
        .slice(0, 10)
        .map(f => ({
          feature: f.type,
          count: f.count,
          label: f.label
        }));

      // Average activities per client
      const averageActivitiesPerClient = uniqueClients > 0 ? Math.round(totalActivities / uniqueClients) : 0;

      // Active clients percent (compared to total portal clients)
      const activeClientsPercent = totalPortalClients > 0 
        ? Math.round((uniqueClients / totalPortalClients) * 100) 
        : 0;

      // Peak activity day
      let peakActivityDay: string | null = null;
      let peakActivityCount = 0;
      for (const [date, data] of dailyMap.entries()) {
        if (data.count > peakActivityCount) {
          peakActivityCount = data.count;
          peakActivityDay = date;
        }
      }

      return {
        totalActivities,
        uniqueClients,
        activityByType,
        activityByClient,
        dailyActivity,
        mostActivePages,
        leastUsedFeatures,
        averageActivitiesPerClient,
        activeClientsPercent,
        peakActivityDay,
        peakActivityCount,
        totalPortalClients
      };
    },
    enabled: !!user?.id
  });
}

function getEmptyStats(): PortalActivityStats {
  return {
    totalActivities: 0,
    uniqueClients: 0,
    activityByType: [],
    activityByClient: [],
    dailyActivity: [],
    mostActivePages: [],
    leastUsedFeatures: [],
    averageActivitiesPerClient: 0,
    activeClientsPercent: 0,
    peakActivityDay: null,
    peakActivityCount: 0,
    totalPortalClients: 0
  };
}

// Hook for getting clients who haven't used the portal at all
export function useInactivePortalClients(period: PortalStatsPeriod = '30d') {
  const { user } = useAuth();
  const startDate = getPeriodStartDate(period);

  return useQuery({
    queryKey: ['inactive-portal-clients', user?.id, period],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all clients with portal access
      const { data: portalClients } = await supabase
        .from('client_accounts')
        .select(`
          client_id,
          is_active,
          last_portal_login,
          client:clients(id, name, email)
        `)
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      if (!portalClients?.length) return [];

      const clientIds = portalClients.map(c => c.client_id);

      // Get clients with activity
      let query = supabase
        .from('client_portal_activity')
        .select('client_id')
        .in('client_id', clientIds);

      if (startDate) {
        query = query.gte('activity_date', startDate.toISOString().split('T')[0]);
      }

      const { data: activities } = await query;
      const activeClientIds = new Set((activities || []).map(a => a.client_id));

      // Return clients without activity
      return portalClients
        .filter(pc => !activeClientIds.has(pc.client_id))
        .map(pc => ({
          clientId: pc.client_id,
          clientName: (pc.client as any)?.name || 'Neznámý',
          email: (pc.client as any)?.email || null,
          lastLogin: pc.last_portal_login
        }));
    },
    enabled: !!user?.id
  });
}
