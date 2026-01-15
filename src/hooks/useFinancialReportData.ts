import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfYear, endOfYear, subYears, getISOWeek, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval, startOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import type { FinancialReportSettings } from "./useFinancialReportSettings";

export interface ClientReportData {
  id: string;
  name: string;
  totalPaid: number;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
}

export interface MonthlyReportData {
  month: string;
  monthNum: number;
  income: number;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
  clientCount: number;
  changePercent: number | null;
}

export interface WeeklyReportData {
  week: number;
  weekLabel: string;
  trainingCount: number;
  soloCount: number;
  duoCount: number;
  trioCount: number;
}

export interface FinancialReportData {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  
  // Year summary
  summary: {
    totalIncome: number;
    totalTrainings: number;
    totalClients: number;
    soloTrainings: number;
    duoTrainings: number;
    trioTrainings: number;
    avgIncomePerTraining: number;
    avgIncomePerClient: number;
  };
  
  // Monthly breakdown
  monthly: MonthlyReportData[];
  
  // Weekly breakdown
  weekly: WeeklyReportData[];
  
  // Clients
  clients: ClientReportData[];
  topClientsRevenuePercent: number;
  
  // Managerial metrics
  managerial: {
    incomePerHour: number | null;
    groupTrainingPercent: number;
    bestMonth: { name: string; income: number } | null;
    worstMonth: { name: string; income: number } | null;
    ytdIncome: number;
    lastYearIncome: number;
    yoyChangePercent: number | null;
  };
  
  // Data validation
  validation: {
    paymentsWithoutClient: number;
    trainingsWithoutClient: number;
    trainedNotPaidDiff: number;
  };
}

export type ReportPeriod = 'year' | '12months' | 'custom';

interface UseFinancialReportDataOptions {
  period: ReportPeriod;
  customStart?: Date;
  customEnd?: Date;
  settings: FinancialReportSettings;
}

export function useFinancialReportData(options: UseFinancialReportDataOptions) {
  const { period, customStart, customEnd, settings } = options;
  
  return useQuery({
    queryKey: ['financial-report-data', period, customStart?.toISOString(), customEnd?.toISOString(), settings.clientDefinition],
    queryFn: async (): Promise<FinancialReportData> => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let periodLabel: string;
      
      switch (period) {
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          periodLabel = `Rok ${now.getFullYear()}`;
          break;
        case '12months':
          endDate = now;
          startDate = subYears(now, 1);
          periodLabel = `Posledních 12 měsíců`;
          break;
        case 'custom':
          startDate = customStart || startOfYear(now);
          endDate = customEnd || now;
          periodLabel = `${format(startDate, 'd.M.yyyy')} - ${format(endDate, 'd.M.yyyy')}`;
          break;
        default:
          startDate = startOfYear(now);
          endDate = now;
          periodLabel = `Rok ${now.getFullYear()}`;
      }

      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();

      // Fetch all data in parallel
      const [
        trainingsResult,
        transactionsResult,
        clientsResult,
        participantsResult,
        lastYearTransactionsResult,
      ] = await Promise.all([
        // Trainings
        supabase
          .from('training_sessions')
          .select('id, date, duration, status, final_price, client_id, participant_count')
          .eq('status', 'completed')
          .gte('date', startStr)
          .lte('date', endStr),
        
        // Transactions (payments)
        supabase
          .from('credit_transactions')
          .select('id, amount, type, client_id, created_at')
          .eq('type', 'payment')
          .gt('amount', 0)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        // Clients
        supabase
          .from('clients')
          .select('id, name, is_archived'),
        
        // Participants for multi-client trainings
        supabase
          .from('training_participants')
          .select('client_id, price_share, training_session_id, training_sessions!inner(status, date, duration, participant_count)')
          .eq('training_sessions.status', 'completed')
          .gte('training_sessions.date', startStr)
          .lte('training_sessions.date', endStr),
        
        // Last year transactions for YoY comparison
        supabase
          .from('credit_transactions')
          .select('amount')
          .eq('type', 'payment')
          .gt('amount', 0)
          .gte('created_at', subYears(startDate, 1).toISOString())
          .lte('created_at', subYears(endDate, 1).toISOString()),
      ]);

      const trainings = trainingsResult.data || [];
      const transactions = transactionsResult.data || [];
      const clients = clientsResult.data || [];
      const participants = participantsResult.data || [];
      const lastYearTransactions = lastYearTransactionsResult.data || [];

      // Build client map
      const clientMap = new Map(clients.map(c => [c.id, c.name]));

      // Calculate income from payments
      const totalIncome = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const lastYearIncome = lastYearTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Count trainings by participant count
      const soloTrainings = trainings.filter(t => (t.participant_count || 1) === 1).length;
      const duoTrainings = trainings.filter(t => t.participant_count === 2).length;
      const trioTrainings = trainings.filter(t => (t.participant_count || 0) >= 3).length;

      // Calculate total training hours
      const totalMinutes = trainings.reduce((sum, t) => sum + (t.duration || 60), 0);
      const totalHours = totalMinutes / 60;

      // Active clients based on definition
      const clientsWithTraining = new Set<string>();
      const clientsWithPayment = new Set<string>();
      const clientStats = new Map<string, { paid: number; trainings: number; solo: number; duo: number; trio: number }>();

      // Process trainings for client stats
      trainings.forEach(t => {
        if (t.client_id) {
          clientsWithTraining.add(t.client_id);
          const stats = clientStats.get(t.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.trainings += 1;
          const pc = t.participant_count || 1;
          if (pc === 1) stats.solo += 1;
          else if (pc === 2) stats.duo += 1;
          else stats.trio += 1;
          clientStats.set(t.client_id, stats);
        }
      });

      // Process participants for multi-client trainings
      participants.forEach((p: any) => {
        if (p.client_id) {
          clientsWithTraining.add(p.client_id);
          const stats = clientStats.get(p.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.trainings += 1;
          const pc = p.training_sessions?.participant_count || 1;
          if (pc === 1) stats.solo += 1;
          else if (pc === 2) stats.duo += 1;
          else stats.trio += 1;
          clientStats.set(p.client_id, stats);
        }
      });

      // Process transactions for client payments
      transactions.forEach(t => {
        if (t.client_id) {
          clientsWithPayment.add(t.client_id);
          const stats = clientStats.get(t.client_id) || { paid: 0, trainings: 0, solo: 0, duo: 0, trio: 0 };
          stats.paid += t.amount || 0;
          clientStats.set(t.client_id, stats);
        }
      });

      // Determine active clients based on setting
      let activeClientIds: Set<string>;
      if (settings.clientDefinition === 'trainings') {
        activeClientIds = clientsWithTraining;
      } else if (settings.clientDefinition === 'payments') {
        activeClientIds = clientsWithPayment;
      } else {
        activeClientIds = new Set([...clientsWithTraining, ...clientsWithPayment]);
      }

      const totalClients = activeClientIds.size;

      // Build client breakdown
      const clientsData: ClientReportData[] = Array.from(clientStats.entries())
        .filter(([id]) => activeClientIds.has(id))
        .map(([id, stats]) => ({
          id,
          name: clientMap.get(id) || 'Neznámý',
          totalPaid: stats.paid,
          trainingCount: stats.trainings,
          soloCount: stats.solo,
          duoCount: stats.duo,
          trioCount: stats.trio,
        }))
        .sort((a, b) => b.totalPaid - a.totalPaid);

      // Top 20% clients revenue percentage
      const top20Count = Math.max(1, Math.ceil(clientsData.length * 0.2));
      const top20Revenue = clientsData.slice(0, top20Count).reduce((sum, c) => sum + c.totalPaid, 0);
      const topClientsRevenuePercent = totalIncome > 0 ? (top20Revenue / totalIncome) * 100 : 0;

      // Monthly breakdown
      const monthlyMap = new Map<string, { income: number; trainings: number; solo: number; duo: number; trio: number; clients: Set<string> }>();
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      months.forEach(month => {
        const key = format(month, 'yyyy-MM');
        monthlyMap.set(key, { income: 0, trainings: 0, solo: 0, duo: 0, trio: 0, clients: new Set() });
      });

      trainings.forEach(t => {
        const key = format(new Date(t.date), 'yyyy-MM');
        const data = monthlyMap.get(key);
        if (data) {
          data.trainings += 1;
          const pc = t.participant_count || 1;
          if (pc === 1) data.solo += 1;
          else if (pc === 2) data.duo += 1;
          else data.trio += 1;
          if (t.client_id) data.clients.add(t.client_id);
        }
      });

      transactions.forEach(t => {
        const key = format(new Date(t.created_at), 'yyyy-MM');
        const data = monthlyMap.get(key);
        if (data) {
          data.income += t.amount || 0;
          if (t.client_id) data.clients.add(t.client_id);
        }
      });

      const monthlyData: MonthlyReportData[] = [];
      let prevIncome: number | null = null;
      
      Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, data]) => {
          const date = new Date(key + '-01');
          const changePercent = prevIncome !== null && prevIncome > 0 
            ? ((data.income - prevIncome) / prevIncome) * 100 
            : null;
          
          monthlyData.push({
            month: format(date, 'LLLL', { locale: cs }),
            monthNum: date.getMonth() + 1,
            income: data.income,
            trainingCount: data.trainings,
            soloCount: data.solo,
            duoCount: data.duo,
            trioCount: data.trio,
            clientCount: data.clients.size,
            changePercent,
          });
          
          prevIncome = data.income;
        });

      // Weekly breakdown
      const weeklyMap = new Map<number, { trainings: number; solo: number; duo: number; trio: number }>();
      
      trainings.forEach(t => {
        const week = getISOWeek(new Date(t.date));
        const data = weeklyMap.get(week) || { trainings: 0, solo: 0, duo: 0, trio: 0 };
        data.trainings += 1;
        const pc = t.participant_count || 1;
        if (pc === 1) data.solo += 1;
        else if (pc === 2) data.duo += 1;
        else data.trio += 1;
        weeklyMap.set(week, data);
      });

      const weeklyData: WeeklyReportData[] = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([week, data]) => ({
          week,
          weekLabel: `Týden ${week}`,
          trainingCount: data.trainings,
          soloCount: data.solo,
          duoCount: data.duo,
          trioCount: data.trio,
        }));

      // Managerial metrics
      const bestMonth = monthlyData.length > 0 
        ? monthlyData.reduce((best, m) => m.income > best.income ? m : best)
        : null;
      const worstMonth = monthlyData.filter(m => m.income > 0).length > 0
        ? monthlyData.filter(m => m.income > 0).reduce((worst, m) => m.income < worst.income ? m : worst)
        : null;

      const groupTrainings = duoTrainings + trioTrainings;
      const groupTrainingPercent = trainings.length > 0 ? (groupTrainings / trainings.length) * 100 : 0;
      
      const yoyChangePercent = lastYearIncome > 0 
        ? ((totalIncome - lastYearIncome) / lastYearIncome) * 100 
        : null;

      // Data validation
      const paymentsWithoutClient = transactions.filter(t => !t.client_id).length;
      const trainingsWithoutClient = trainings.filter(t => !t.client_id && (t.participant_count || 1) === 1).length;
      const trainedTotal = trainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
      const trainedNotPaidDiff = trainedTotal - totalIncome;

      return {
        period: {
          start: startDate,
          end: endDate,
          label: periodLabel,
        },
        summary: {
          totalIncome,
          totalTrainings: trainings.length,
          totalClients,
          soloTrainings,
          duoTrainings,
          trioTrainings,
          avgIncomePerTraining: trainings.length > 0 ? totalIncome / trainings.length : 0,
          avgIncomePerClient: totalClients > 0 ? totalIncome / totalClients : 0,
        },
        monthly: monthlyData,
        weekly: weeklyData,
        clients: clientsData,
        topClientsRevenuePercent,
        managerial: {
          incomePerHour: totalHours > 0 ? totalIncome / totalHours : null,
          groupTrainingPercent,
          bestMonth: bestMonth ? { name: bestMonth.month, income: bestMonth.income } : null,
          worstMonth: worstMonth ? { name: worstMonth.month, income: worstMonth.income } : null,
          ytdIncome: totalIncome,
          lastYearIncome,
          yoyChangePercent,
        },
        validation: {
          paymentsWithoutClient,
          trainingsWithoutClient,
          trainedNotPaidDiff,
        },
      };
    },
    enabled: settings.isEnabled,
  });
}
