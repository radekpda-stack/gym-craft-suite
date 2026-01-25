import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { useAuth } from './useAuth';

// LocalStorage key for dismissed smart alerts (must match NotificationCenter)
const DISMISSED_SMART_ALERTS_KEY = 'dismissed-smart-alerts';

function getDismissedSmartAlerts(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_SMART_ALERTS_KEY);
    if (!stored) return new Set();
    const data = JSON.parse(stored);
    // Filter out old dismissals (older than 24 hours)
    const now = Date.now();
    const valid = Object.entries(data).filter(([_, ts]) => now - (ts as number) < 24 * 60 * 60 * 1000);
    return new Set(valid.map(([id]) => id));
  } catch {
    return new Set();
  }
}

export interface SmartAlert {
  id: string;
  type: 'no_training_scheduled' | 'low_credit' | 'birthdays_this_month' | 'profit_trend' | 'inactive_nutrition' | 'new_badge' | 'client_milestone';
  severity: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  clientId?: string;
  clientName?: string;
  value?: number;
  link?: string;
  createdAt: Date;
}

// Get clients without training scheduled this week
async function getClientsWithoutTraining(userId: string): Promise<SmartAlert[]> {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Get all active clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_archived', false);

  if (!clients || clients.length === 0) return [];

  // Get scheduled trainings this week
  const { data: trainings } = await supabase
    .from('training_sessions')
    .select('client_id')
    .eq('user_id', userId)
    .gte('date', weekStart.toISOString())
    .lte('date', weekEnd.toISOString())
    .in('status', ['scheduled', 'completed']);

  const clientsWithTraining = new Set(trainings?.map(t => t.client_id) || []);
  
  const withoutTraining = clients.filter(c => !clientsWithTraining.has(c.id));
  
  if (withoutTraining.length === 0) return [];

  // Return max 3 alerts
  return withoutTraining.slice(0, 3).map(client => ({
    id: `no-training-${client.id}`,
    type: 'no_training_scheduled' as const,
    severity: 'warning' as const,
    title: 'Chybí trénink',
    message: `${client.name} nemá naplánovaný trénink tento týden`,
    clientId: client.id,
    clientName: client.name,
    link: `/clients/${client.id}?tab=trainings`,
    createdAt: new Date(),
  }));
}

// Get clients with low credit
async function getClientsWithLowCredit(userId: string): Promise<SmartAlert[]> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, credit_balance')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .lt('credit_balance', 100)
    .order('credit_balance', { ascending: true });

  if (!clients || clients.length === 0) return [];

  return clients.slice(0, 3).map(client => ({
    id: `low-credit-${client.id}`,
    type: 'low_credit' as const,
    severity: (client.credit_balance ?? 0) < 0 ? 'warning' as const : 'info' as const,
    title: (client.credit_balance ?? 0) < 0 ? 'Záporný kredit' : 'Nízký kredit',
    message: `${client.name} má kredit ${client.credit_balance ?? 0} Kč`,
    clientId: client.id,
    clientName: client.name,
    value: client.credit_balance ?? 0,
    link: `/clients/${client.id}?tab=credit`,
    createdAt: new Date(),
  }));
}

// Get birthday count this month
async function getBirthdaysThisMonth(userId: string): Promise<SmartAlert | null> {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, birth_date')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .not('birth_date', 'is', null);

  if (!clients || clients.length === 0) return null;

  const today = new Date();
  const currentMonth = today.getMonth();

  const birthdaysThisMonth = clients.filter(client => {
    if (!client.birth_date) return false;
    const birthDate = new Date(client.birth_date);
    return birthDate.getMonth() === currentMonth;
  });

  if (birthdaysThisMonth.length === 0) return null;

  const names = birthdaysThisMonth.slice(0, 3).map(c => c.name);
  const moreCount = birthdaysThisMonth.length - 3;

  return {
    id: 'birthdays-this-month',
    type: 'birthdays_this_month',
    severity: 'info',
    title: `🎂 ${birthdaysThisMonth.length} narozenin tento měsíc`,
    message: moreCount > 0 
      ? `${names.join(', ')} a ${moreCount} dalších`
      : names.join(', '),
    value: birthdaysThisMonth.length,
    link: '/clients?filter=birthdays',
    createdAt: new Date(),
  };
}

// Calculate profit trend
async function getProfitTrend(userId: string): Promise<SmartAlert | null> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Get this month's income
  const { data: thisMonthData } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'purchase')
    .gte('created_at', thisMonthStart.toISOString());

  const thisMonthIncome = thisMonthData?.reduce((sum, t) => sum + t.amount, 0) || 0;

  // Get last month's income
  const { data: lastMonthData } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'purchase')
    .gte('created_at', lastMonthStart.toISOString())
    .lte('created_at', lastMonthEnd.toISOString());

  const lastMonthIncome = lastMonthData?.reduce((sum, t) => sum + t.amount, 0) || 0;

  if (lastMonthIncome === 0) return null;

  // Calculate day-adjusted comparison
  const dayOfMonth = now.getDate();
  const daysInLastMonth = endOfMonth(subMonths(now, 1)).getDate();
  const adjustedLastMonth = (lastMonthIncome / daysInLastMonth) * dayOfMonth;

  const percentChange = Math.round(((thisMonthIncome - adjustedLastMonth) / adjustedLastMonth) * 100);

  if (Math.abs(percentChange) < 10) return null;

  return {
    id: 'profit-trend',
    type: 'profit_trend',
    severity: percentChange > 0 ? 'success' : 'warning',
    title: percentChange > 0 ? '📈 Růst příjmů' : '📉 Pokles příjmů',
    message: `Tvůj příjem je o ${Math.abs(percentChange)}% ${percentChange > 0 ? 'vyšší' : 'nižší'} oproti minulému měsíci`,
    value: percentChange,
    link: '/statistics?tab=finance',
    createdAt: new Date(),
  };
}

// Get clients who haven't logged nutrition recently (simplified - checks all active clients)
async function getInactiveNutritionClients(userId: string): Promise<SmartAlert | null> {
  try {
    const twoWeeksAgo = subWeeks(new Date(), 2);

    // Get all active clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (!clients || clients.length === 0) return null;

    // Get recent nutrition log sessions
    const clientIds = clients.map(c => c.id);
    const { data: recentLogs } = await supabase
      .from('nutrition_log_sessions')
      .select('client_id')
      .in('client_id', clientIds)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0]);

    // Only consider clients who have EVER logged nutrition
    const { data: allLogs } = await supabase
      .from('nutrition_log_sessions')
      .select('client_id')
      .in('client_id', clientIds);

    const clientsWithNutrition = new Set(allLogs?.map(l => l.client_id) || []);
    const activeClientIds = new Set(recentLogs?.map(l => l.client_id) || []);
    
    // Filter: only clients who logged before but not recently
    const inactiveClients = clients.filter(c => 
      clientsWithNutrition.has(c.id) && !activeClientIds.has(c.id)
    );

    if (inactiveClients.length === 0) return null;

    return {
      id: 'inactive-nutrition',
      type: 'inactive_nutrition',
      severity: 'info',
      title: `🥗 ${inactiveClients.length} klientů neloguje výživu`,
      message: `${inactiveClients.slice(0, 3).map(c => c.name).join(', ')}${inactiveClients.length > 3 ? ` a ${inactiveClients.length - 3} dalších` : ''} nezaznamenali výživu 2+ týdny`,
      value: inactiveClients.length,
      link: '/nutrition',
      createdAt: new Date(),
    };
  } catch {
    return null;
  }
}

// Get recent badge achievements
async function getRecentBadges(userId: string): Promise<SmartAlert[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: badges } = await supabase
    .from('client_badges')
    .select(`
      id,
      earned_at,
      badge_definitions!inner(name, icon_key),
      clients!inner(id, name, user_id)
    `)
    .eq('clients.user_id', userId)
    .gte('earned_at', oneDayAgo.toISOString())
    .order('earned_at', { ascending: false })
    .limit(3);

  if (!badges || badges.length === 0) return [];

  return badges.map((badge: any) => ({
    id: `badge-${badge.id}`,
    type: 'new_badge' as const,
    severity: 'success' as const,
    title: '🏆 Nový badge!',
    message: `${badge.clients.name} získal badge "${badge.badge_definitions.name}"`,
    clientId: badge.clients.id,
    clientName: badge.clients.name,
    link: `/clients/${badge.clients.id}?tab=progress`,
    createdAt: new Date(badge.earned_at),
  }));
}

export function useSmartAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['smart-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [
        noTraining,
        lowCredit,
        birthdays,
        profitTrend,
        inactiveNutrition,
        recentBadges,
      ] = await Promise.all([
        getClientsWithoutTraining(user.id),
        getClientsWithLowCredit(user.id),
        getBirthdaysThisMonth(user.id),
        getProfitTrend(user.id),
        getInactiveNutritionClients(user.id),
        getRecentBadges(user.id),
      ]);

      const allAlerts: SmartAlert[] = [
        ...recentBadges,
        ...noTraining,
        ...lowCredit,
      ];

      if (birthdays) allAlerts.push(birthdays);
      if (profitTrend) allAlerts.push(profitTrend);
      if (inactiveNutrition) allAlerts.push(inactiveNutrition);

      // Filter out dismissed alerts
      const dismissed = getDismissedSmartAlerts();
      const activeAlerts = allAlerts.filter(alert => !dismissed.has(alert.id));

      // Sort by severity and recency
      return activeAlerts.sort((a, b) => {
        const severityOrder = { warning: 0, success: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    enabled: !!user?.id,
  });
}
