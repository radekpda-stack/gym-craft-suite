import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, subMonths, format, startOfMonth } from 'date-fns';

export interface SmartInsight {
  type: 'action' | 'info' | 'warning';
  icon: string;
  message: string;
  category: 'finance' | 'training' | 'client' | 'general';
}

export function useSmartStatsInsights(tab?: 'finance' | 'training' | 'client' | 'career') {
  return useQuery({
    queryKey: ['smart-stats-insights', tab],
    queryFn: async (): Promise<SmartInsight[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));

      const insights: SmartInsight[] = [];

      // Fetch data based on tab
      const [trainingsRes, clientsRes, expensesRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, client_id, final_price, status, canceled_at')
          .eq('user_id', user.id)
          .gte('date', sixtyDaysAgo.toISOString()),
        supabase
          .from('clients')
          .select('id, name, credit_balance, is_archived')
          .eq('user_id', user.id)
          .eq('is_archived', false),
        supabase
          .from('business_expenses')
          .select('amount, date')
          .eq('user_id', user.id)
          .gte('date', format(lastMonthStart, 'yyyy-MM-dd')),
      ]);

      const trainings = trainingsRes.data || [];
      const clients = clientsRes.data || [];
      const expenses = expensesRes.data || [];

      const completed = trainings.filter(t => t.status === 'completed');
      const canceled = trainings.filter(t => t.status === 'canceled');

      // --- FINANCE INSIGHTS ---
      if (!tab || tab === 'finance' || tab === 'career') {
        // Low credit clients
        const lowCreditClients = clients.filter(c => c.credit_balance !== null && c.credit_balance < 500 && c.credit_balance >= 0);
        if (lowCreditClients.length > 0) {
          insights.push({
            type: 'action',
            icon: '💳',
            message: `${lowCreditClients.length} klient${lowCreditClients.length > 1 ? 'ů má' : ' má'} kredit pod 500 Kč. Připomenout dobití?`,
            category: 'finance',
          });
        }

        // Cancellation rate
        const recentCompleted = completed.filter(t => new Date(t.date) >= thirtyDaysAgo);
        const recentCanceled = canceled.filter(t => new Date(t.date) >= thirtyDaysAgo);
        const cancelRate = recentCompleted.length + recentCanceled.length > 0
          ? Math.round((recentCanceled.length / (recentCompleted.length + recentCanceled.length)) * 100)
          : 0;
        if (cancelRate > 15) {
          insights.push({
            type: 'warning',
            icon: '⚠️',
            message: `Míra zrušení ${cancelRate}% za posledních 30 dní. Zvážit storno podmínky?`,
            category: 'finance',
          });
        }

        // Expense trend
        const thisMonthExpenses = expenses
          .filter(e => new Date(e.date) >= thisMonthStart)
          .reduce((s, e) => s + e.amount, 0);
        const lastMonthExpenses = expenses
          .filter(e => new Date(e.date) >= lastMonthStart && new Date(e.date) < thisMonthStart)
          .reduce((s, e) => s + e.amount, 0);
        if (lastMonthExpenses > 0 && thisMonthExpenses > lastMonthExpenses * 1.2) {
          insights.push({
            type: 'info',
            icon: '📊',
            message: `Náklady tento měsíc +${Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)}% oproti minulému.`,
            category: 'finance',
          });
        }
      }

      // --- TRAINING INSIGHTS ---
      if (!tab || tab === 'training' || tab === 'career') {
        // Day of week analysis
        const dayCounts: Record<number, number> = {};
        completed.filter(t => new Date(t.date) >= thirtyDaysAgo).forEach(t => {
          const day = new Date(t.date).getDay();
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
        const maxDay = Object.entries(dayCounts).sort(([, a], [, b]) => Number(b) - Number(a))[0];
        const minDay = Object.entries(dayCounts).filter(([, v]) => v > 0).sort(([, a], [, b]) => Number(a) - Number(b))[0];
        if (maxDay && minDay && Number(maxDay[1]) > Number(minDay[1]) * 2) {
          insights.push({
            type: 'info',
            icon: '📅',
            message: `${dayNames[Number(maxDay[0])]} je 2× vytíženější než ${dayNames[Number(minDay[0])]}. Přesuňte kapacitu?`,
            category: 'training',
          });
        }

        // Average price analysis
        const prices = completed.filter(t => t.final_price && t.final_price > 0).map(t => t.final_price!);
        if (prices.length >= 5) {
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const belowAvg = prices.filter(p => p < avgPrice * 0.8).length;
          if (belowAvg > prices.length * 0.2) {
            insights.push({
              type: 'action',
              icon: '💰',
              message: `${belowAvg} tréninků pod 80% průměrné sazby. Sjednotit ceník?`,
              category: 'training',
            });
          }
        }
      }

      // --- CLIENT INSIGHTS ---
      if (!tab || tab === 'client' || tab === 'career') {
        // Inactive clients
        const activeClientIds = new Set(
          completed.filter(t => new Date(t.date) >= thirtyDaysAgo).map(t => t.client_id)
        );
        const inactiveClients = clients.filter(c => !activeClientIds.has(c.id));
        const longInactive = inactiveClients.filter(c => {
          const lastTraining = completed
            .filter(t => t.client_id === c.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          return lastTraining && new Date(lastTraining.date) < subDays(now, 45);
        });
        if (longInactive.length > 0) {
          const names = longInactive.slice(0, 2).map(c => c.name).join(', ');
          insights.push({
            type: 'action',
            icon: '👤',
            message: `${longInactive.length > 2 ? `${names} a ${longInactive.length - 2} dalš${longInactive.length - 2 > 1 ? 'ích' : 'í'}` : names} netrénoval${longInactive.length > 1 ? 'i' : '/a'} 45+ dní. Follow-up?`,
            category: 'client',
          });
        }
      }

      return insights;
    },
    staleTime: 1000 * 60 * 5,
  });
}
