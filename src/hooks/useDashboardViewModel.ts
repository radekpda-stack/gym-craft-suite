import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays, startOfYear, endOfYear } from 'date-fns';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Status } from '@/lib/statusUtils';

// ===================================
// UNIFIED DASHBOARD VIEW MODEL
// Single source of truth for Dashboard 2.0
// ===================================

export type DayStatus = 'ok' | 'warning' | 'critical';

export interface PriorityTask {
  id: string;
  type: 'overload' | 'credit' | 'feedback' | 'unpaid';
  severity: Status;
  clientId: string;
  clientName: string;
  title: string;
  subtitle: string;
  detail?: string;
  actionUrl: string;
  actionLabel?: string;
  meta?: Record<string, any>;
}

export interface CapacityInfo {
  completed: number;
  scheduled: number;
  total: number;
  percentUsed: number;
}

export interface ParticipantBreakdown {
  count: number;
  avgPrice: number;
  totalPrice: number;
}

export interface FinanceMetrics {
  creditAtRisk: { count: number; amount: number };
  unpaidTotal: { count: number; amount: number };
  monthlyIncome: number;
  lastMonthIncome: number;
  avgPerTraining: number;
  lastMonthAvgPerTraining: number;
  trainingsWithPriceCount: number;
  incomeChange: number; // percent vs last period
  trainingsByParticipants: {
    solo: ParticipantBreakdown;   // 1 osoba
    duo: ParticipantBreakdown;    // 2 osoby
    group: ParticipantBreakdown;  // 3+ osob
  };
}

export interface TrendData {
  trainingsThisMonth: number;
  trainingsLastMonth: number;
  trainingsChange: number;
  incomeThisMonth: number;
  incomeLastMonth: number;
  incomeChange: number;
  cancellationRate: number;
  cancelledCount: number;
  totalTrainingsCount: number;
  productShare: number; // % of total income
  productIncome: number;
  totalRevenue: number;
  creditsReceived: number;        // Celkem přijatých kreditů tento měsíc
  creditsReceivedCount: number;   // Počet transakcí dobití
  
  // Roční statistiky
  yearlyHours: number;           // Odtrénované hodiny za rok
  yearlyIncome: number;          // Celkový příjem za rok
  avgHourlyRate: number;         // Průměrná hodinovka
  
  // Aktivita klientů
  activeClients: number;         // Aktivní klienti (30 dní)
  totalClients: number;          // Celkem klientů
  newClientsThisMonth: number;   // Noví klienti tento měsíc
  retentionRate: number;         // Retence %
  retainedClients: number;       // Počet vrátivších se klientů
  lastMonthActiveClients: number; // Aktivní minulý měsíc
  
  // Časové vzorce
  busiestDay: string;            // Nejčastější den (např. "Čtvrtek")
  busiestDayCount: number;       // Počet tréninků v ten den
  dayDistribution: Array<{day: string; count: number}>;
  hourDistribution: Array<{hour: number; count: number}>;
  
  // Top klienti
  topClientName: string;
  topClientValue: number;
  topClients: Array<{name: string; value: number}>;
}

export interface ScheduleItem {
  id: string;
  clientId: string;
  clientName: string;
  time: string;
  date: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  hasFeedback: boolean;
  hasIssue: boolean; // high RPE, bad feedback, etc.
}

export interface DashboardViewModel {
  // Core status
  dayStatus: DayStatus;
  allClear: boolean;
  
  // Priority tasks (max 5, impact-sorted)
  priorityTasks: PriorityTask[];
  totalTasksCount: number;
  
  // Today's capacity
  capacity: CapacityInfo;
  
  // Financial overview
  finance: FinanceMetrics;
  
  // Schedule
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
  
  // Trends
  trends: TrendData;
  
  // Success messages
  successMessages: string[];
}

const DISMISSED_KEY = 'dashboard_dismissed_v2';

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      const { ids, timestamp } = JSON.parse(stored);
      // Clear after 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return new Set(ids);
      }
    }
  } catch {}
  return new Set();
}

export function dismissTask(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({
    ids: Array.from(dismissed),
    timestamp: Date.now(),
  }));
}

export function useDashboardViewModel() {
  const { data: appSettings } = useAppSettings();
  
  return useQuery({
    queryKey: ['dashboard-view-model', appSettings?.low_credit_threshold],
    queryFn: async (): Promise<DashboardViewModel> => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);
      const thirtyDaysAgo = subDays(now, 30);
      const sevenDaysAgo = subDays(now, 7);
      const threeDaysAgo = subDays(now, 3);
      
      const lowCreditThreshold = (appSettings?.low_credit_threshold as number) || 800;
      const criticalThreshold = (appSettings?.critical_credit_threshold as number) || 0;
      
      // Parallel fetch all data
      const [
        todayTrainingsResult,
        weekTrainingsResult,
        clientsResult,
        budgetMembersResult,
        thisMonthTrainingsResult,
        lastMonthTrainingsResult,
        recentCompletedResult,
        feedbackRequestsResult,
        recentFeedbackResult,
        recentHighRpeResult,
        unpaidResult,
        creditTransactionsResult,
        productTransactionsResult,
        // New queries for trends
        yearlyTrainingsResult,
        activeClientsResult,
        lastMonthActiveClientsResult,
        newClientsResult,
        allCompletedTrainingsResult,
        lifetimeValueResult,
      ] = await Promise.all([
        // Today's trainings
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, rpe, clients(name)')
          .gte('date', todayStart.toISOString())
          .lte('date', todayEnd.toISOString())
          .order('date', { ascending: true }),
        
        // Week's trainings (for schedule)
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, clients(name)')
          .gte('date', todayStart.toISOString())
          .lte('date', endOfDay(subDays(todayEnd, -6)).toISOString())
          .order('date', { ascending: true }),
        
        // All clients with credit balance
        supabase
          .from('clients')
          .select('id, name, credit_balance, payment_mode, is_archived, created_at')
          .eq('is_archived', false),
        
        // Budget group members (to exclude from low credit)
        supabase
          .from('client_budget_members')
          .select('client_id'),
        
        // This month trainings
        supabase
          .from('training_sessions')
          .select('id, status, final_price')
          .gte('date', monthStart.toISOString())
          .lte('date', monthEnd.toISOString()),
        
        // Last month trainings
        supabase
          .from('training_sessions')
          .select('id, status, final_price')
          .gte('date', lastMonthStart.toISOString())
          .lte('date', lastMonthEnd.toISOString()),
        
        // Recent completed trainings (for feedback check)
        supabase
          .from('training_sessions')
          .select('id, date, client_id, clients(name, feedback_enabled)')
          .eq('status', 'completed')
          .gte('date', threeDaysAgo.toISOString())
          .lte('date', now.toISOString()),
        
        // Feedback requests
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .in('status', ['completed', 'pending']),
        
        // Recent feedback with issues
        supabase
          .from('training_feedback')
          .select('id, client_id, training_date, body_feel, pain, rpe_rating, is_red_flag')
          .gte('training_date', sevenDaysAgo.toISOString())
          .order('training_date', { ascending: false }),
        
        // Recent high RPE trainings
        supabase
          .from('training_sessions')
          .select('id, date, client_id, rpe, clients(name)')
          .eq('status', 'completed')
          .gte('date', sevenDaysAgo.toISOString())
          .gte('rpe', 8),
        
        // Unpaid trainings
        supabase
          .from('training_sessions')
          .select('id, date, final_price, client_id, clients(name)')
          .eq('status', 'completed')
          .eq('payment_status', 'pending'),
        
        // This month credit transactions (income from payments)
        supabase
          .from('credit_transactions')
          .select('amount, type, payment_method')
          .in('type', ['payment', 'manual'])
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        
        // Product transactions (type = 'product')
        supabase
          .from('credit_transactions')
          .select('amount, type, product_id')
          .eq('type', 'product')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString()),
        
        // Yearly trainings (for yearly stats)
        supabase
          .from('training_sessions')
          .select('id, date, status, final_price')
          .gte('date', yearStart.toISOString())
          .lte('date', yearEnd.toISOString())
          .eq('status', 'completed'),
        
        // Active clients (last 30 days) via training_participants
        supabase
          .from('training_participants')
          .select('client_id, training_session_id, training_sessions!inner(date, status)')
          .gte('training_sessions.date', thirtyDaysAgo.toISOString())
          .eq('training_sessions.status', 'completed'),
        
        // Last month active clients (for retention)
        supabase
          .from('training_participants')
          .select('client_id, training_session_id, training_sessions!inner(date, status)')
          .gte('training_sessions.date', lastMonthStart.toISOString())
          .lte('training_sessions.date', lastMonthEnd.toISOString())
          .eq('training_sessions.status', 'completed'),
        
        // New clients this month
        supabase
          .from('clients')
          .select('id')
          .gte('created_at', monthStart.toISOString())
          .eq('is_archived', false),
        
        // All completed trainings for day/hour distribution
        supabase
          .from('training_sessions')
          .select('id, date')
          .eq('status', 'completed'),
        
        // Lifetime value - all debit transactions per client
        supabase
          .from('credit_transactions')
          .select('client_id, amount, clients(name)')
          .lt('amount', 0),
      ]);
      
      const dismissedIds = getDismissedIds();
      
      // Process clients - exclude cash_only and budget members
      const budgetMemberIds = new Set((budgetMembersResult.data || []).map((m: any) => m.client_id));
      const eligibleClients = (clientsResult.data || [])
        .filter((c: any) => 
          c.payment_mode !== 'cash_only' && 
          !budgetMemberIds.has(c.id)
        );
      
      // ===== PRIORITY TASKS =====
      const tasks: PriorityTask[] = [];
      
      // 1. Overload warnings (highest priority)
      const feedbackByClient = new Map<string, any[]>();
      (recentFeedbackResult.data || []).forEach((f: any) => {
        const existing = feedbackByClient.get(f.client_id) || [];
        existing.push(f);
        feedbackByClient.set(f.client_id, existing);
      });
      
      const highRpeByClient = new Map<string, any[]>();
      (recentHighRpeResult.data || []).forEach((t: any) => {
        const existing = highRpeByClient.get(t.client_id) || [];
        existing.push(t);
        highRpeByClient.set(t.client_id, existing);
      });
      
      highRpeByClient.forEach((trainings, clientId) => {
        const clientFeedback = feedbackByClient.get(clientId) || [];
        const badFeedback = clientFeedback.filter(f => 
          (f.pain && f.pain >= 6) || (f.body_feel && f.body_feel <= 4) || f.is_red_flag
        );
        
        if (badFeedback.length >= 2 || (trainings.length >= 2 && badFeedback.length >= 1)) {
          const id = `overload-${clientId}`;
          if (!dismissedIds.has(id)) {
            const clientName = (trainings[0]?.clients as any)?.name || 'Neznámý';
            tasks.push({
              id,
              type: 'overload',
              severity: 'error',
              clientId,
              clientName,
              title: clientName,
              subtitle: 'Přetížení',
              detail: 'Vysoké RPE + špatný feedback',
              actionUrl: `/clients/${clientId}`,
              actionLabel: 'Otevřít klienta',
            });
          }
        }
      });
      
      // 2. Credit warnings
      eligibleClients.forEach((client: any) => {
        const balance = client.credit_balance || 0;
        if (balance <= criticalThreshold) {
          const id = `credit-${client.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'credit',
              severity: 'error',
              clientId: client.id,
              clientName: client.name,
              title: client.name,
              subtitle: 'Bez kreditu',
              detail: `${balance} Kč`,
              actionUrl: `/clients/${client.id}`,
              actionLabel: 'Přidat kredit',
              meta: { balance },
            });
          }
        } else if (balance < lowCreditThreshold) {
          const id = `credit-${client.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'credit',
              severity: 'warning',
              clientId: client.id,
              clientName: client.name,
              title: client.name,
              subtitle: 'Nízký kredit',
              detail: `${balance} Kč`,
              actionUrl: `/clients/${client.id}`,
              actionLabel: 'Přidat kredit',
              meta: { balance },
            });
          }
        }
      });
      
      // 3. Missing feedback
      const completedFeedbackIds = new Set(
        (feedbackRequestsResult.data || [])
          .filter((f: any) => f.status === 'completed')
          .map((f: any) => f.training_session_id)
      );
      
      const eligibleTrainings = (recentCompletedResult.data || [])
        .filter((t: any) => (t.clients as any)?.feedback_enabled !== false);
      
      eligibleTrainings
        .filter((t: any) => !completedFeedbackIds.has(t.id))
        .forEach((t: any) => {
          const id = `feedback-${t.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'feedback',
              severity: 'warning',
              clientId: t.client_id,
              clientName: (t.clients as any)?.name || 'Neznámý',
              title: (t.clients as any)?.name || 'Neznámý',
              subtitle: 'Chybí feedback',
              detail: new Date(t.date).toLocaleDateString('cs-CZ'),
              actionUrl: `/trainings/${t.id}`,
              actionLabel: 'Poslat odkaz',
            });
          }
        });
      
      // 4. Unpaid trainings
      (unpaidResult.data || []).forEach((t: any) => {
        const daysOld = differenceInDays(now, new Date(t.date));
        if (daysOld > 7) {
          const id = `unpaid-${t.id}`;
          if (!dismissedIds.has(id)) {
            tasks.push({
              id,
              type: 'unpaid',
              severity: daysOld > 30 ? 'error' : 'warning',
              clientId: t.client_id,
              clientName: (t.clients as any)?.name || 'Neznámý',
              title: (t.clients as any)?.name || 'Neznámý',
              subtitle: 'Nezaplaceno',
              detail: `${t.final_price || 0} Kč • ${daysOld} dní`,
              actionUrl: `/clients/${t.client_id}`,
              actionLabel: 'Vyúčtování',
              meta: { amount: t.final_price, daysOld },
            });
          }
        }
      });
      
      // Sort by severity (error first) then by type priority
      const typePriority = { overload: 0, credit: 1, unpaid: 2, feedback: 3 };
      tasks.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === 'error' ? -1 : 1;
        }
        return typePriority[a.type] - typePriority[b.type];
      });
      
      const priorityTasks = tasks.slice(0, 5);
      
      // ===== CAPACITY =====
      const todayTrainings = todayTrainingsResult.data || [];
      const completed = todayTrainings.filter((t: any) => t.status === 'completed').length;
      const scheduled = todayTrainings.filter((t: any) => t.status === 'scheduled').length;
      const total = completed + scheduled;
      
      const capacity: CapacityInfo = {
        completed,
        scheduled,
        total,
        percentUsed: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
      
      // ===== FINANCE =====
      const creditAtRiskClients = eligibleClients.filter((c: any) => 
        (c.credit_balance || 0) < lowCreditThreshold
      );
      const creditAtRiskAmount = creditAtRiskClients.reduce((sum: number, c: any) => 
        sum + Math.max(0, lowCreditThreshold - (c.credit_balance || 0)), 0
      );
      
      const unpaidItems = unpaidResult.data || [];
      const unpaidTotalAmount = unpaidItems.reduce((sum: number, t: any) => 
        sum + (t.final_price || 0), 0
      );
      
      const thisMonthTrainings = thisMonthTrainingsResult.data || [];
      const lastMonthTrainings = lastMonthTrainingsResult.data || [];
      
      const thisMonthIncome = thisMonthTrainings
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + (t.final_price || 0), 0);
      
      const lastMonthIncome = lastMonthTrainings
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + (t.final_price || 0), 0);
      
      // Count only trainings with filled price for average calculation
      const trainingsWithPrice = thisMonthTrainings.filter((t: any) => t.status === 'completed' && t.final_price && t.final_price > 0);
      const avgPerTraining = trainingsWithPrice.length > 0 ? Math.round(thisMonthIncome / trainingsWithPrice.length) : 0;
      
      const lastMonthTrainingsWithPrice = lastMonthTrainings.filter((t: any) => t.status === 'completed' && t.final_price && t.final_price > 0);
      const lastMonthAvgPerTraining = lastMonthTrainingsWithPrice.length > 0 ? Math.round(lastMonthIncome / lastMonthTrainingsWithPrice.length) : 0;
      
      const incomeChange = lastMonthIncome > 0 
        ? Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) 
        : 0;
      
      // Calculate trainings breakdown by participant count
      const soloTrainings = trainingsWithPrice.filter((t: any) => !t.participant_count || t.participant_count === 1);
      const duoTrainings = trainingsWithPrice.filter((t: any) => t.participant_count === 2);
      const groupTrainings = trainingsWithPrice.filter((t: any) => t.participant_count >= 3);
      
      const calcBreakdown = (trainings: any[]): { count: number; avgPrice: number; totalPrice: number } => {
        const total = trainings.reduce((sum: number, t: any) => sum + (t.final_price || 0), 0);
        return {
          count: trainings.length,
          avgPrice: trainings.length > 0 ? Math.round(total / trainings.length) : 0,
          totalPrice: total,
        };
      };
      
      const finance: FinanceMetrics = {
        creditAtRisk: { count: creditAtRiskClients.length, amount: creditAtRiskAmount },
        unpaidTotal: { count: unpaidItems.length, amount: unpaidTotalAmount },
        monthlyIncome: thisMonthIncome,
        lastMonthIncome,
        avgPerTraining,
        lastMonthAvgPerTraining,
        trainingsWithPriceCount: trainingsWithPrice.length,
        incomeChange,
        trainingsByParticipants: {
          solo: calcBreakdown(soloTrainings),
          duo: calcBreakdown(duoTrainings),
          group: calcBreakdown(groupTrainings),
        },
      };
      
      // ===== SCHEDULE =====
      const feedbackIds = new Set(
        (feedbackRequestsResult.data || [])
          .filter((f: any) => f.status === 'completed')
          .map((f: any) => f.training_session_id)
      );
      
      const mapTrainingToScheduleItem = (t: any): ScheduleItem => ({
        id: t.id,
        clientId: t.client_id,
        clientName: (t.clients as any)?.name || 'Neznámý',
        time: new Date(t.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(t.date),
        status: t.status,
        hasFeedback: feedbackIds.has(t.id),
        hasIssue: t.rpe && t.rpe >= 9,
      });
      
      const todaySchedule = todayTrainings.map(mapTrainingToScheduleItem);
      const weekSchedule = (weekTrainingsResult.data || []).map(mapTrainingToScheduleItem);
      
      // ===== TRENDS =====
      const thisMonthCompletedCount = thisMonthTrainings.filter((t: any) => t.status === 'completed').length;
      const lastMonthCompletedCount = lastMonthTrainings.filter((t: any) => t.status === 'completed').length;
      const trainingsChange = lastMonthCompletedCount > 0
        ? Math.round(((thisMonthCompletedCount - lastMonthCompletedCount) / lastMonthCompletedCount) * 100)
        : 0;
      
      const thisMonthCancelled = thisMonthTrainings.filter((t: any) => t.status === 'canceled').length;
      const cancellationRate = thisMonthTrainings.length > 0
        ? Math.round((thisMonthCancelled / thisMonthTrainings.length) * 100)
        : 0;
      
      const productIncome = (productTransactionsResult.data || [])
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0);
      const trainingIncome = (creditTransactionsResult.data || [])
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      // Total revenue = training income (payments + manual) + product sales
      const totalRevenue = trainingIncome + productIncome;
      const productShare = totalRevenue > 0 ? Math.round((productIncome / totalRevenue) * 100) : 0;
      
      // Calculate credits received (positive amounts = payments/charges)
      const creditTransactions = creditTransactionsResult.data || [];
      const creditsReceived = creditTransactions.reduce((sum: number, t: any) => sum + (t.amount > 0 ? t.amount : 0), 0);
      const creditsReceivedCount = creditTransactions.filter((t: any) => t.amount > 0).length;
      
      // ===== YEARLY STATS =====
      const yearlyTrainings = yearlyTrainingsResult.data || [];
      const yearlyHours = yearlyTrainings.length; // 1 training = 1 hour
      const yearlyIncome = yearlyTrainings.reduce((sum: number, t: any) => sum + (t.final_price || 0), 0);
      const avgHourlyRate = yearlyHours > 0 ? Math.round(yearlyIncome / yearlyHours) : 0;
      
      // ===== CLIENT ACTIVITY =====
      const activeClientIds = new Set((activeClientsResult.data || []).map((p: any) => p.client_id));
      const activeClients = activeClientIds.size;
      const totalClients = (clientsResult.data || []).length;
      const newClientsThisMonth = (newClientsResult.data || []).length;
      
      // Retention - clients active this month who were also active last month
      const lastMonthActiveClientIds = new Set((lastMonthActiveClientsResult.data || []).map((p: any) => p.client_id));
      const thisMonthActiveClientIds = new Set(
        (activeClientsResult.data || [])
          .filter((p: any) => {
            const date = new Date((p.training_sessions as any)?.date);
            return date >= monthStart && date <= monthEnd;
          })
          .map((p: any) => p.client_id)
      );
      const retainedClients = [...lastMonthActiveClientIds].filter(id => thisMonthActiveClientIds.has(id)).length;
      const lastMonthActiveClients = lastMonthActiveClientIds.size;
      const retentionRate = lastMonthActiveClients > 0 
        ? Math.round((retainedClients / lastMonthActiveClients) * 100) 
        : 0;
      
      // ===== DAY/HOUR DISTRIBUTION =====
      const allCompletedTrainings = allCompletedTrainingsResult.data || [];
      const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
      const dayCountMap = new Map<number, number>();
      const hourCountMap = new Map<number, number>();
      
      allCompletedTrainings.forEach((t: any) => {
        const date = new Date(t.date);
        const day = date.getDay();
        const hour = date.getHours();
        dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);
        hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1);
      });
      
      const dayDistribution = dayNames.map((day, idx) => ({
        day,
        count: dayCountMap.get(idx) || 0,
      })).sort((a, b) => b.count - a.count);
      
      const hourDistribution = Array.from(hourCountMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count);
      
      const busiestDay = dayDistribution[0]?.day || 'N/A';
      const busiestDayCount = dayDistribution[0]?.count || 0;
      
      // ===== TOP CLIENTS (LIFETIME VALUE) =====
      const lifetimeData = lifetimeValueResult.data || [];
      const clientSpendMap = new Map<string, { name: string; value: number }>();
      
      lifetimeData.forEach((t: any) => {
        const clientId = t.client_id;
        const clientName = (t.clients as any)?.name || 'Neznámý';
        const amount = Math.abs(t.amount || 0);
        
        if (clientSpendMap.has(clientId)) {
          clientSpendMap.get(clientId)!.value += amount;
        } else {
          clientSpendMap.set(clientId, { name: clientName, value: amount });
        }
      });
      
      const topClients = Array.from(clientSpendMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      const topClientName = topClients[0]?.name || 'N/A';
      const topClientValue = topClients[0]?.value || 0;
      
      const trends: TrendData = {
        trainingsThisMonth: thisMonthCompletedCount,
        trainingsLastMonth: lastMonthCompletedCount,
        trainingsChange,
        incomeThisMonth: thisMonthIncome,
        incomeLastMonth: lastMonthIncome,
        incomeChange,
        cancellationRate,
        cancelledCount: thisMonthCancelled,
        totalTrainingsCount: thisMonthTrainings.length,
        productShare,
        productIncome,
        totalRevenue,
        creditsReceived,
        creditsReceivedCount,
        // New metrics
        yearlyHours,
        yearlyIncome,
        avgHourlyRate,
        activeClients,
        totalClients,
        newClientsThisMonth,
        retentionRate,
        retainedClients,
        lastMonthActiveClients,
        busiestDay,
        busiestDayCount,
        dayDistribution,
        hourDistribution,
        topClientName,
        topClientValue,
        topClients,
      };
      
      // ===== DAY STATUS =====
      const errorTasks = tasks.filter(t => t.severity === 'error');
      const warningTasks = tasks.filter(t => t.severity === 'warning');
      
      let dayStatus: DayStatus = 'ok';
      if (errorTasks.length > 0) {
        dayStatus = 'critical';
      } else if (warningTasks.length > 3) {
        dayStatus = 'warning';
      }
      
      // ===== SUCCESS MESSAGES =====
      const successMessages: string[] = [];
      if (tasks.length === 0) {
        successMessages.push('Dnes žádné kritické problémy');
      }
      if (unpaidItems.length === 0) {
        successMessages.push('Všechny tréninky uhrazené');
      }
      if (capacity.scheduled === 0 && capacity.completed > 0) {
        successMessages.push('Kapacita ideální');
      }
      
      return {
        dayStatus,
        allClear: tasks.length === 0,
        priorityTasks,
        totalTasksCount: tasks.length,
        capacity,
        finance,
        todaySchedule,
        weekSchedule,
        trends,
        successMessages,
      };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
