import { useMemo } from 'react';
import { useTrainingSessions } from './useTrainingSessions';
import { startOfMonth, subMonths, startOfYear, subYears, isAfter, isBefore, differenceInMonths } from 'date-fns';

export interface TrainingPeriodStats {
  thisMonth: number;
  last3Months: number;
  last6Months: number;
  thisYear: number;
  lastYear: number;
  total: number;
  averagePerMonth: number;
  firstTrainingDate: Date | null;
}

export function useClientTrainingPeriodStats(clientId: string | undefined) {
  const { data: sessions = [], isLoading } = useTrainingSessions(clientId);

  const stats = useMemo<TrainingPeriodStats>(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    
    if (completedSessions.length === 0) {
      return {
        thisMonth: 0,
        last3Months: 0,
        last6Months: 0,
        thisYear: 0,
        lastYear: 0,
        total: 0,
        averagePerMonth: 0,
        firstTrainingDate: null,
      };
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const threeMonthsAgo = subMonths(now, 3);
    const sixMonthsAgo = subMonths(now, 6);
    const thisYearStart = startOfYear(now);
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = startOfYear(now);

    // Sort sessions by date to find first training
    const sortedSessions = [...completedSessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstTrainingDate = sortedSessions.length > 0 ? new Date(sortedSessions[0].date) : null;

    // Count sessions for each period
    let thisMonth = 0;
    let last3Months = 0;
    let last6Months = 0;
    let thisYear = 0;
    let lastYear = 0;

    completedSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      
      if (isAfter(sessionDate, thisMonthStart) || sessionDate.getTime() === thisMonthStart.getTime()) {
        thisMonth++;
      }
      
      if (isAfter(sessionDate, threeMonthsAgo)) {
        last3Months++;
      }
      
      if (isAfter(sessionDate, sixMonthsAgo)) {
        last6Months++;
      }
      
      if (isAfter(sessionDate, thisYearStart) || sessionDate.getTime() === thisYearStart.getTime()) {
        thisYear++;
      }
      
      if (
        (isAfter(sessionDate, lastYearStart) || sessionDate.getTime() === lastYearStart.getTime()) &&
        isBefore(sessionDate, lastYearEnd)
      ) {
        lastYear++;
      }
    });

    // Calculate average per month
    const total = completedSessions.length;
    const monthsActive = firstTrainingDate 
      ? Math.max(1, differenceInMonths(now, firstTrainingDate) + 1)
      : 1;
    const averagePerMonth = Math.round((total / monthsActive) * 10) / 10;

    return {
      thisMonth,
      last3Months,
      last6Months,
      thisYear,
      lastYear,
      total,
      averagePerMonth,
      firstTrainingDate,
    };
  }, [sessions]);

  return { stats, isLoading };
}
