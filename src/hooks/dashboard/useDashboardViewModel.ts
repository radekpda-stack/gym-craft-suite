/**
 * Combined Dashboard ViewModel hook
 * Orchestrates all dashboard hooks for backwards compatibility
 */

import { useDashboardCapacity } from './useDashboardCapacity';
import { useDashboardSchedule } from './useDashboardSchedule';
import { useDashboardTasks, dismissTask } from './useDashboardTasks';
import { useDashboardFinance } from './useDashboardFinance';
import { useDashboardTrends } from './useDashboardTrends';
import { useDashboardClients } from './useDashboardClients';
import type { DashboardViewModel, DayStatus } from './types';

export { dismissTask };

export function useDashboardViewModel() {
  const capacity = useDashboardCapacity();
  const schedule = useDashboardSchedule();
  const tasks = useDashboardTasks();
  const finance = useDashboardFinance();
  const trends = useDashboardTrends();
  const clients = useDashboardClients();

  const isLoading = capacity.isLoading || schedule.isLoading || tasks.isLoading || finance.isLoading || trends.isLoading || clients.isLoading;
  const isError = capacity.isError || schedule.isError || tasks.isError || finance.isError || trends.isError || clients.isError;

  const priorityTasks = tasks.data?.priorityTasks || [];
  const errorTasks = priorityTasks.filter(t => t.severity === 'error');
  const warningTasks = priorityTasks.filter(t => t.severity === 'warning');

  let dayStatus: DayStatus = 'ok';
  if (errorTasks.length > 0) dayStatus = 'critical';
  else if (warningTasks.length > 3) dayStatus = 'warning';

  const successMessages: string[] = [];
  if ((tasks.data?.totalTasksCount || 0) === 0) successMessages.push('Dnes žádné kritické problémy');
  if ((finance.data?.unpaidTotal.count || 0) === 0) successMessages.push('Všechny tréninky uhrazené');

  const data: DashboardViewModel | undefined = (!isLoading && !isError) ? {
    dayStatus,
    allClear: (tasks.data?.totalTasksCount || 0) === 0,
    priorityTasks,
    totalTasksCount: tasks.data?.totalTasksCount || 0,
    capacity: capacity.data || { completed: 0, scheduled: 0, total: 0, percentUsed: 0 },
    todayEstimatedIncome: schedule.data?.todayEstimatedIncome || 0,
    uniqueClientsToday: schedule.data?.uniqueClientsToday || 0,
    finance: finance.data || { creditAtRisk: { count: 0, amount: 0 }, unpaidTotal: { count: 0, amount: 0 }, monthlyIncome: 0, lastMonthIncome: 0, avgPerTraining: 0, lastMonthAvgPerTraining: 0, trainingsWithPriceCount: 0, incomeChange: 0, trainingsByParticipants: { solo: { count: 0, avgPrice: 0, totalPrice: 0 }, duo: { count: 0, avgPrice: 0, totalPrice: 0 }, group: { count: 0, avgPrice: 0, totalPrice: 0 } } },
    todaySchedule: schedule.data?.todaySchedule || [],
    weekSchedule: schedule.data?.weekSchedule || [],
    weeklySummary: schedule.data?.weeklySummary || { trainingsThisWeek: 0, trainingsLastWeek: 0, incomeThisWeek: 0, incomeLastWeek: 0, weekTrend: 'stable', trainingsTrend: 'stable' },
    clientsQuickInfo: clients.data || [],
    trends: trends.data || {} as any,
    successMessages,
  } : undefined;

  return { data, isLoading, isError, error: capacity.error || schedule.error || tasks.error || finance.error || trends.error || clients.error };
}
