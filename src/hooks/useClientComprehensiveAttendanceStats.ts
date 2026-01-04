import { useMemo } from 'react';
import { useTrainingSessions } from './useTrainingSessions';
import { 
  startOfMonth, 
  startOfWeek, 
  startOfYear,
  subYears,
  format, 
  differenceInMonths, 
  differenceInWeeks,
  isAfter,
  isBefore,
  isSameWeek
} from 'date-fns';
import { cs } from 'date-fns/locale';

const MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

export interface MilestoneInfo {
  value: number;
  reached: boolean;
  reachedAt?: Date;
}

export interface BestMonthInfo {
  month: string;
  count: number;
}

export interface ComprehensiveAttendanceStats {
  // Core totals
  totalTrainings: number;
  firstTrainingDate: Date | null;
  monthsWithTrainer: number;
  
  // Streaks
  currentWeekStreak: number;
  
  // Averages
  averagePerMonth: number;
  averagePerWeek: number;
  
  // Best performances
  bestMonth: BestMonthInfo | null;
  
  // Year comparison
  thisYear: number;
  lastYear: number;
  
  // Milestones
  milestones: MilestoneInfo[];
  nextMilestone: number | null;
  progressToNextMilestone: number; // 0-100
}

export function useClientComprehensiveAttendanceStats(clientId: string | undefined) {
  const { data: sessions = [], isLoading } = useTrainingSessions(clientId);

  const stats = useMemo<ComprehensiveAttendanceStats>(() => {
    const completedSessions = sessions.filter(s => s.status === 'completed');
    
    if (completedSessions.length === 0) {
      return {
        totalTrainings: 0,
        firstTrainingDate: null,
        monthsWithTrainer: 0,
        currentWeekStreak: 0,
        averagePerMonth: 0,
        averagePerWeek: 0,
        bestMonth: null,
        thisYear: 0,
        lastYear: 0,
        milestones: MILESTONES.map(value => ({ value, reached: false })),
        nextMilestone: MILESTONES[0],
        progressToNextMilestone: 0,
      };
    }

    const now = new Date();
    const totalTrainings = completedSessions.length;
    
    // Sort sessions by date
    const sortedSessions = [...completedSessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const firstTrainingDate = new Date(sortedSessions[0].date);
    const monthsWithTrainer = Math.max(1, differenceInMonths(now, firstTrainingDate) + 1);
    
    // Calculate averages
    const averagePerMonth = Math.round((totalTrainings / monthsWithTrainer) * 10) / 10;
    const weeksActive = Math.max(1, differenceInWeeks(now, firstTrainingDate) + 1);
    const averagePerWeek = Math.round((totalTrainings / weeksActive) * 10) / 10;
    
    // Calculate current week streak (consecutive weeks with at least 1 training)
    const currentWeekStreak = calculateWeekStreak(sortedSessions);
    
    // Find best month
    const monthlyCountMap = new Map<string, { count: number; date: Date }>();
    completedSessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const monthKey = format(startOfMonth(sessionDate), 'yyyy-MM');
      const current = monthlyCountMap.get(monthKey);
      if (current) {
        current.count++;
      } else {
        monthlyCountMap.set(monthKey, { count: 1, date: sessionDate });
      }
    });
    
    let bestMonth: BestMonthInfo | null = null;
    let maxCount = 0;
    monthlyCountMap.forEach((data, _) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        bestMonth = {
          month: format(data.date, 'LLLL yyyy', { locale: cs }),
          count: data.count,
        };
      }
    });
    
    // Year comparisons
    const thisYearStart = startOfYear(now);
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = thisYearStart;
    
    let thisYear = 0;
    let lastYear = 0;
    completedSessions.forEach(session => {
      const sessionDate = new Date(session.date);
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
    
    // Calculate milestones
    const milestones: MilestoneInfo[] = MILESTONES.map(value => {
      const reached = totalTrainings >= value;
      let reachedAt: Date | undefined;
      
      if (reached && sortedSessions.length >= value) {
        reachedAt = new Date(sortedSessions[value - 1].date);
      }
      
      return { value, reached, reachedAt };
    });
    
    // Find next milestone
    const nextMilestoneObj = milestones.find(m => !m.reached);
    const nextMilestone = nextMilestoneObj?.value ?? null;
    
    // Calculate progress to next milestone
    let progressToNextMilestone = 100;
    if (nextMilestone) {
      const prevMilestoneValue = milestones
        .filter(m => m.reached)
        .pop()?.value ?? 0;
      const range = nextMilestone - prevMilestoneValue;
      const progress = totalTrainings - prevMilestoneValue;
      progressToNextMilestone = Math.round((progress / range) * 100);
    }

    return {
      totalTrainings,
      firstTrainingDate,
      monthsWithTrainer,
      currentWeekStreak,
      averagePerMonth,
      averagePerWeek,
      bestMonth,
      thisYear,
      lastYear,
      milestones,
      nextMilestone,
      progressToNextMilestone,
    };
  }, [sessions]);

  return { stats, isLoading };
}

function calculateWeekStreak(sortedSessions: { date: string }[]): number {
  if (sortedSessions.length === 0) return 0;
  
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  
  // Check if there's a training this week
  const hasTrainingThisWeek = sortedSessions.some(s => 
    isSameWeek(new Date(s.date), now, { weekStartsOn: 1 })
  );
  
  // Group sessions by week
  const weekSet = new Set<string>();
  sortedSessions.forEach(session => {
    const weekStart = startOfWeek(new Date(session.date), { weekStartsOn: 1 });
    weekSet.add(format(weekStart, 'yyyy-MM-dd'));
  });
  
  const sortedWeeks = Array.from(weekSet).sort((a, b) => b.localeCompare(a)); // Descending
  
  if (sortedWeeks.length === 0) return 0;
  
  // Start counting from current week (or last week if no training this week)
  let streak = 0;
  let checkWeek = hasTrainingThisWeek ? currentWeekStart : new Date(sortedWeeks[0]);
  
  for (const weekStr of sortedWeeks) {
    const weekDate = new Date(weekStr);
    const expectedWeek = startOfWeek(checkWeek, { weekStartsOn: 1 });
    
    if (format(weekDate, 'yyyy-MM-dd') === format(expectedWeek, 'yyyy-MM-dd')) {
      streak++;
      // Move to previous week
      checkWeek = new Date(expectedWeek);
      checkWeek.setDate(checkWeek.getDate() - 7);
    } else if (weekDate < expectedWeek) {
      // Gap found, streak broken
      break;
    }
  }
  
  return streak;
}
