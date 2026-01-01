/**
 * Dashboard hook types - shared across dashboard hooks
 */

import type { ScheduleItem } from '@/types/training';
import type { ClientQuickInfo } from '@/types/client';

export type DayStatus = 'ok' | 'warning' | 'critical';
export type TaskType = 'overload' | 'credit' | 'feedback' | 'unpaid' | 'health-issue' | 'no-training' | 'training-now' | 'training-today';
export type TaskSeverity = 'error' | 'warning' | 'info';

export interface PriorityTask {
  id: string;
  type: TaskType;
  severity: TaskSeverity;
  clientId: string;
  clientName: string;
  title: string;
  subtitle: string;
  detail?: string;
  actionUrl: string;
  actionLabel: string;
  meta?: Record<string, unknown>;
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
  incomeChange: number;
  trainingsByParticipants: {
    solo: ParticipantBreakdown;
    duo: ParticipantBreakdown;
    group: ParticipantBreakdown;
  };
}

export interface TopClient {
  name: string;
  value: number;
}

export interface DayDistributionItem {
  day: string;
  count: number;
}

export interface HourDistributionItem {
  hour: number;
  count: number;
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
  productShare: number;
  productIncome: number;
  totalRevenue: number;
  creditsReceived: number;
  creditsReceivedCount: number;
  yearlyHours: number;
  yearlyIncome: number;
  avgHourlyRate: number;
  activeClients: number;
  totalClients: number;
  newClientsThisMonth: number;
  retentionRate: number;
  retainedClients: number;
  lastMonthActiveClients: number;
  busiestDay: string;
  busiestDayCount: number;
  dayDistribution: DayDistributionItem[];
  hourDistribution: HourDistributionItem[];
  topClientName: string;
  topClientValue: number;
  topClients: TopClient[];
}

export interface WeeklySummary {
  trainingsThisWeek: number;
  trainingsLastWeek: number;
  incomeThisWeek: number;
  incomeLastWeek: number;
  weekTrend: 'up' | 'down' | 'stable';
  trainingsTrend: 'up' | 'down' | 'stable';
}

export interface DashboardViewModel {
  dayStatus: DayStatus;
  allClear: boolean;
  priorityTasks: PriorityTask[];
  totalTasksCount: number;
  capacity: CapacityInfo;
  todayEstimatedIncome: number;
  uniqueClientsToday: number;
  finance: FinanceMetrics;
  todaySchedule: ScheduleItem[];
  weekSchedule: ScheduleItem[];
  weeklySummary: WeeklySummary;
  clientsQuickInfo: ClientQuickInfo[];
  trends: TrendData;
  successMessages: string[];
}

// DB row types for type-safe data processing
export interface TrainingSessionRow {
  id: string;
  date: string;
  status: string;
  client_id: string;
  rpe?: number | null;
  final_price?: number | null;
  payment_status?: string;
  participant_count?: number;
  clients?: { name: string; feedback_enabled?: boolean } | null;
}

export interface ClientRow {
  id: string;
  name: string;
  credit_balance: number | null;
  payment_mode: string | null;
  is_archived: boolean;
  is_favorite: boolean;
  created_at: string;
}

export interface BudgetMemberRow {
  client_id: string;
}

export interface FeedbackRequestRow {
  training_session_id: string;
  status: string;
}

export interface TrainingFeedbackRow {
  id: string;
  client_id: string;
  training_date: string;
  body_feel?: number | null;
  pain?: number | null;
  rpe_rating?: number | null;
  is_red_flag?: boolean;
}

export interface UnpaidTrainingRow {
  id: string;
  date: string;
  final_price: number | null;
  client_id: string;
  clients?: { name: string } | null;
}

export interface CreditTransactionRow {
  amount: number;
  type: string;
  payment_method?: string | null;
  created_at?: string;
  product_id?: string | null;
  client_id?: string;
  clients?: { name: string } | null;
}

export interface TrainingParticipantRow {
  client_id: string;
  training_session_id: string;
  training_sessions?: { date: string; status: string } | null;
}
