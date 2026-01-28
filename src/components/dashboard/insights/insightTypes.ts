/**
 * Types for dashboard insights
 */

import type { ReactNode } from 'react';

export interface InsightDetail {
  title: string;
  description: string;
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'stable';
  };
  breakdown?: {
    items: { label: string; value: string }[];
  };
  tip?: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface Insight {
  id: string;
  icon: ReactNode;
  text: string;
  type: 'success' | 'warning' | 'info';
  priority: number;
  detail?: InsightDetail;
}

export type InsightWithDetail = Insight;

export interface InsightGeneratorContext {
  language: 'cs' | 'en';
  trends: {
    cancellationRate: number;
    cancelledCount: number;
    retentionRate: number;
    retainedClients: number;
    lastMonthActiveClients: number;
    newClientsThisMonth: number;
    activeClients: number;
    totalClients: number;
    topClientName: string;
    topClientValue: number;
    busiestDay: string;
    busiestDayCount: number;
    hourDistribution: { hour: number; count: number }[];
  };
  finance: {
    creditAtRisk: { count: number; amount: number };
    unpaidTotal: { count: number; amount: number };
    monthlyIncome: number;
    lastMonthIncome: number;
    incomeChange: number;
    avgPerTraining: number;
    lastMonthAvgPerTraining: number;
    trainingsWithPriceCount: number;
    trainingsByParticipants: {
      solo: { count: number; avgPrice: number };
      duo: { count: number; avgPrice: number };
      group: { count: number; avgPrice: number };
    };
  };
  weeklySummary: {
    trainingsThisWeek: number;
    trainingsLastWeek: number;
    incomeThisWeek: number;
    incomeLastWeek: number;
    weekTrend: 'up' | 'down' | 'stable';
    trainingsTrend: 'up' | 'down' | 'stable';
  };
  capacity: {
    completed: number;
    scheduled: number;
    total: number;
    percentUsed: number;
  };
  todayEstimatedIncome: number;
  todayScheduleCount: number;
}
