/**
 * Dashboard-specific types used by useDashboardViewModel and dashboard components
 */

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
  todaySchedule: import('./training').ScheduleItem[];
  weekSchedule: import('./training').ScheduleItem[];
  weeklySummary: WeeklySummary;
  clientsQuickInfo: import('./client').ClientQuickInfo[];
  trends: TrendData;
  successMessages: string[];
}
