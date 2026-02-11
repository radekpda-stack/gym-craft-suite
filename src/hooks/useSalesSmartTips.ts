import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export interface SalesSmartTip {
  id: string;
  icon: 'lightbulb' | 'user' | 'trending' | 'package' | 'clock';
  text: string;
  subtext?: string;
  priority: number;
}

export function useSalesSmartTips() {
  // Today's sales vs yesterday
  const todayStats = useQuery({
    queryKey: ['sales_today_vs_yesterday'],
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const today = startOfDay(new Date());
      const yesterday = startOfDay(subDays(new Date(), 1));
      const yesterdayEnd = endOfDay(subDays(new Date(), 1));

      const [todayRes, yesterdayRes] = await Promise.all([
        supabase
          .from('sales_orders')
          .select('total_amount')
          .gte('created_at', today.toISOString())
          .eq('payment_status', 'completed'),
        supabase
          .from('sales_orders')
          .select('total_amount')
          .gte('created_at', yesterday.toISOString())
          .lte('created_at', yesterdayEnd.toISOString())
          .eq('payment_status', 'completed'),
      ]);

      const todayTotal = (todayRes.data || []).reduce((s, o) => s + (o.total_amount || 0), 0);
      const todayCount = todayRes.data?.length || 0;
      const yesterdayTotal = (yesterdayRes.data || []).reduce((s, o) => s + (o.total_amount || 0), 0);
      const yesterdayCount = yesterdayRes.data?.length || 0;

      return { todayTotal, todayCount, yesterdayTotal, yesterdayCount };
    },
  });

  // Upcoming sessions with client purchase history
  const upcomingTip = useQuery({
    queryKey: ['sales_upcoming_client_tip'],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const now = new Date().toISOString();
      const endOfToday = endOfDay(new Date()).toISOString();

      // Get upcoming sessions today
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, date, client_id, clients(name)')
        .gte('date', now)
        .lte('date', endOfToday)
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .limit(3);

      if (!sessions || sessions.length === 0) return null;

      // For the next session, check their purchase history
      const nextSession = sessions[0];
      if (!nextSession.client_id) return null;

      const { data: purchases } = await supabase
        .from('sales_order_items')
        .select('name_snapshot, quantity, order_id, sales_orders!inner(client_id)')
        .eq('sales_orders.client_id', nextSession.client_id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Count product frequency
      const freq: Record<string, number> = {};
      (purchases || []).forEach(p => {
        freq[p.name_snapshot] = (freq[p.name_snapshot] || 0) + p.quantity;
      });

      const topProduct = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

      return {
        clientName: (nextSession.clients as any)?.name || 'Klient',
        sessionTime: format(new Date(nextSession.date), 'HH:mm'),
        topProduct: topProduct ? topProduct[0] : null,
        purchaseCount: topProduct ? topProduct[1] : 0,
      };
    },
  });

  const tips = useMemo(() => {
    const result: SalesSmartTip[] = [];

    // Upcoming client tip
    if (upcomingTip.data) {
      const { clientName, sessionTime, topProduct } = upcomingTip.data;
      if (topProduct) {
        result.push({
          id: 'upcoming-client',
          icon: 'user',
          text: `${clientName} má trénink v ${sessionTime}`,
          subtext: `Obvykle kupuje: ${topProduct}`,
          priority: 1,
        });
      }
    }

    // Today vs yesterday comparison
    if (todayStats.data) {
      const { todayTotal, todayCount, yesterdayTotal } = todayStats.data;
      if (yesterdayTotal > 0) {
        const change = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        if (Math.abs(change) >= 5) {
          result.push({
            id: 'today-vs-yesterday',
            icon: 'trending',
            text: `Dnes ${change > 0 ? '+' : ''}${change.toFixed(0)}% oproti včera`,
            subtext: `${todayCount} prodejů`,
            priority: 2,
          });
        }
      }
    }

    return result.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [todayStats.data, upcomingTip.data]);

  const todayTotal = todayStats.data?.todayTotal || 0;
  const todayCount = todayStats.data?.todayCount || 0;
  const yesterdayTotal = todayStats.data?.yesterdayTotal || 0;

  return {
    tips,
    todayTotal,
    todayCount,
    yesterdayTotal,
    isLoading: todayStats.isLoading,
  };
}
