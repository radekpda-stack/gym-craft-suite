/**
 * @deprecated Use imports from '@/hooks/dashboard' instead
 * This file is kept for backwards compatibility
 */

export { 
  useDashboardViewModel, 
  dismissTask 
} from './dashboard/useDashboardViewModel';

export type {
  DayStatus,
  PriorityTask,
  CapacityInfo,
  ParticipantBreakdown,
  FinanceMetrics,
  TrendData,
  WeeklySummary,
  DashboardViewModel,
} from './dashboard/types';

export type { ScheduleItem } from '@/types/training';
export type { ClientQuickInfo } from '@/types/client';
