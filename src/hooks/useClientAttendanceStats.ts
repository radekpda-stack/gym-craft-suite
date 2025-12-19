import { useMemo } from 'react';
import { useTrainingSessions } from './useTrainingSessions';
import { startOfMonth, format, subMonths } from 'date-fns';

export interface AttendanceStats {
  totalTrainings: number;
  completedCount: number;
  canceledCount: number;
  lateCancellationCount: number;
  canceledPercentage: number;
  lateCancellationPercentage: number;
  attendancePercentage: number;
  monthlyData: {
    month: string;
    completed: number;
    canceled: number;
    lateCanceled: number;
  }[];
}

export function useClientAttendanceStats(clientId?: string) {
  const { data: sessions = [], isLoading } = useTrainingSessions(clientId);

  const stats = useMemo((): AttendanceStats => {
    if (!sessions.length) {
      return {
        totalTrainings: 0,
        completedCount: 0,
        canceledCount: 0,
        lateCancellationCount: 0,
        canceledPercentage: 0,
        lateCancellationPercentage: 0,
        attendancePercentage: 100,
        monthlyData: [],
      };
    }

    // Filter out scheduled (future) trainings for stats
    const pastTrainings = sessions.filter(s => 
      s.status === 'completed' || s.status === 'canceled'
    );

    const completedCount = pastTrainings.filter(s => s.status === 'completed').length;
    const canceledCount = pastTrainings.filter(s => s.status === 'canceled').length;
    const lateCancellationCount = pastTrainings.filter(s => 
      s.status === 'canceled' && s.is_late_cancellation
    ).length;

    const totalTrainings = pastTrainings.length;
    
    const canceledPercentage = totalTrainings > 0 
      ? Math.round((canceledCount / totalTrainings) * 100) 
      : 0;
    
    const lateCancellationPercentage = canceledCount > 0
      ? Math.round((lateCancellationCount / canceledCount) * 100)
      : 0;
    
    const attendancePercentage = totalTrainings > 0
      ? Math.round((completedCount / totalTrainings) * 100)
      : 100;

    // Generate monthly data for the last 6 months
    const monthlyMap = new Map<string, { completed: number; canceled: number; lateCanceled: number }>();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(startOfMonth(monthDate), 'yyyy-MM');
      monthlyMap.set(monthKey, { completed: 0, canceled: 0, lateCanceled: 0 });
    }

    // Aggregate data
    pastTrainings.forEach(session => {
      const monthKey = format(startOfMonth(new Date(session.date)), 'yyyy-MM');
      if (monthlyMap.has(monthKey)) {
        const current = monthlyMap.get(monthKey)!;
        if (session.status === 'completed') {
          current.completed++;
        } else if (session.status === 'canceled') {
          current.canceled++;
          if (session.is_late_cancellation) {
            current.lateCanceled++;
          }
        }
      }
    });

    const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'MMM'),
      ...data,
    }));

    return {
      totalTrainings,
      completedCount,
      canceledCount,
      lateCancellationCount,
      canceledPercentage,
      lateCancellationPercentage,
      attendancePercentage,
      monthlyData,
    };
  }, [sessions]);

  return { stats, isLoading };
}
