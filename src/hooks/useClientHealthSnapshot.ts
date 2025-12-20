import { useMemo } from 'react';
import { useTrainingSessions } from './useTrainingSessions';
import { useClientFeedback } from './useTrainingFeedback';
import { useClientAttendanceStats } from './useClientAttendanceStats';
import { subDays } from 'date-fns';

export type TrendDirection = 'up' | 'stable' | 'down';
export type AttendanceLevel = 'regular' | 'fluctuating' | 'dropouts';
export type CreditLevel = 'ok' | 'low' | 'exhausted';

export interface RecurringPain {
  area: string;
  count: number;
}

export interface ClientHealthSnapshot {
  // Trend tréninkové zátěže (posledních 7-10 tréninků)
  trainingLoadTrend: TrendDirection;
  trainingLoadLabel: string;
  
  // Trend feedbacku (posledních 3-5 feedbacků)
  feedbackTrend: TrendDirection;
  feedbackTrendLabel: string;
  
  // Opakovaná bolest (stejná oblast ≥2× v posledních 5 feedbackech)
  recurringPain: RecurringPain[];
  
  // Docházka (% za posledních 30 dní)
  attendanceLevel: AttendanceLevel;
  attendancePercentage: number;
  attendanceLabel: string;
  
  // Stav kreditu
  creditLevel: CreditLevel;
  creditLabel: string;
  
  // Poslední data
  lastFeedbackId?: string;
  lastTrainingId?: string;
  lastFeedbackDate?: string;
  lastTrainingDate?: string;
  
  // Meta
  hasEnoughData: boolean;
  isLoading: boolean;
}

export function useClientHealthSnapshot(
  clientId: string | undefined,
  creditBalance: number,
  creditThresholds = { warning: 800, critical: 0 }
): ClientHealthSnapshot {
  const { data: sessions = [], isLoading: sessionsLoading } = useTrainingSessions(clientId);
  const { data: feedback = [], isLoading: feedbackLoading } = useClientFeedback(clientId);
  const { stats: attendanceStats, isLoading: attendanceLoading } = useClientAttendanceStats(clientId);

  const snapshot = useMemo((): Omit<ClientHealthSnapshot, 'isLoading'> => {
    // ========================================
    // A) TREND TRÉNINKOVÉ ZÁTĚŽE
    // ========================================
    const completedSessions = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    let trainingLoadTrend: TrendDirection = 'stable';
    let trainingLoadLabel = 'Stabilní';

    if (completedSessions.length >= 4) {
      const recentSessions = completedSessions.slice(0, Math.ceil(completedSessions.length / 2));
      const olderSessions = completedSessions.slice(Math.ceil(completedSessions.length / 2));

      // Calculate average RPE if available
      const recentRPE = recentSessions.filter(s => s.rpe).map(s => s.rpe!);
      const olderRPE = olderSessions.filter(s => s.rpe).map(s => s.rpe!);
      
      const avgRecentRPE = recentRPE.length > 0 ? recentRPE.reduce((a, b) => a + b, 0) / recentRPE.length : null;
      const avgOlderRPE = olderRPE.length > 0 ? olderRPE.reduce((a, b) => a + b, 0) / olderRPE.length : null;

      // Compare training frequency per week
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);
      
      const recentCount = completedSessions.filter(s => new Date(s.date) >= thirtyDaysAgo).length;
      const olderCount = completedSessions.filter(s => {
        const date = new Date(s.date);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length;

      // Determine trend based on RPE and/or frequency
      if (avgRecentRPE !== null && avgOlderRPE !== null) {
        const rpeDiff = avgRecentRPE - avgOlderRPE;
        if (rpeDiff > 0.5) {
          trainingLoadTrend = 'up';
          trainingLoadLabel = 'Zvyšuje se';
        } else if (rpeDiff < -0.5) {
          trainingLoadTrend = 'down';
          trainingLoadLabel = 'Klesá';
        }
      } else if (recentCount > olderCount + 1) {
        trainingLoadTrend = 'up';
        trainingLoadLabel = 'Zvyšuje se';
      } else if (recentCount < olderCount - 1) {
        trainingLoadTrend = 'down';
        trainingLoadLabel = 'Klesá';
      }
    }

    // ========================================
    // B) TREND FEEDBACKU
    // ========================================
    const recentFeedback = feedback.slice(0, 5);
    
    let feedbackTrend: TrendDirection = 'stable';
    let feedbackTrendLabel = 'Stejné';

    if (recentFeedback.length >= 4) {
      const recent2 = recentFeedback.slice(0, 2);
      const older2 = recentFeedback.slice(2, 4);

      // Compare energy (body_feel or energy_rating) and pain
      const avgRecentEnergy = recent2
        .filter(f => f.body_feel !== null || f.energy_rating !== null)
        .reduce((sum, f) => sum + (f.body_feel ?? f.energy_rating ?? 0), 0) / Math.max(recent2.filter(f => f.body_feel !== null || f.energy_rating !== null).length, 1);
      
      const avgOlderEnergy = older2
        .filter(f => f.body_feel !== null || f.energy_rating !== null)
        .reduce((sum, f) => sum + (f.body_feel ?? f.energy_rating ?? 0), 0) / Math.max(older2.filter(f => f.body_feel !== null || f.energy_rating !== null).length, 1);

      const avgRecentPain = recent2
        .filter(f => f.pain !== null)
        .reduce((sum, f) => sum + (f.pain ?? 0), 0) / Math.max(recent2.filter(f => f.pain !== null).length, 1);
      
      const avgOlderPain = older2
        .filter(f => f.pain !== null)
        .reduce((sum, f) => sum + (f.pain ?? 0), 0) / Math.max(older2.filter(f => f.pain !== null).length, 1);

      const energyImproved = avgRecentEnergy > avgOlderEnergy + 0.5;
      const painDecreased = avgRecentPain < avgOlderPain - 0.5;
      const energyDeclined = avgRecentEnergy < avgOlderEnergy - 0.5;
      const painIncreased = avgRecentPain > avgOlderPain + 0.5;

      if (energyImproved || painDecreased) {
        feedbackTrend = 'up';
        feedbackTrendLabel = 'Lepší';
      } else if (energyDeclined || painIncreased) {
        feedbackTrend = 'down';
        feedbackTrendLabel = 'Horší';
      }
    }

    // ========================================
    // C) OPAKOVANÁ BOLEST
    // ========================================
    const last14DaysFeedback = feedback.filter(f => {
      const date = new Date(f.created_at);
      return date >= subDays(new Date(), 14);
    }).slice(0, 5);

    const painAreaCounts: Record<string, number> = {};
    
    last14DaysFeedback.forEach(f => {
      // Check pain_area field
      if (f.pain_area && f.pain_area !== 'none') {
        const areas = f.pain_area.split(',').map(a => a.trim());
        areas.forEach(area => {
          const normalizedArea = area.replace(/_left$|_right$|_both$/, '');
          painAreaCounts[normalizedArea] = (painAreaCounts[normalizedArea] || 0) + 1;
        });
      }
      
      // Check pain_area_intensities
      if (f.pain_area_intensities) {
        const intensities = f.pain_area_intensities as Record<string, number>;
        Object.entries(intensities).forEach(([area, intensity]) => {
          if (intensity >= 3) { // Only count significant pain
            const normalizedArea = area.replace(/_left$|_right$|_both$/, '');
            painAreaCounts[normalizedArea] = (painAreaCounts[normalizedArea] || 0) + 1;
          }
        });
      }
    });

    const recurringPain: RecurringPain[] = Object.entries(painAreaCounts)
      .filter(([_, count]) => count >= 2)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count);

    // ========================================
    // D) DOCHÁZKA
    // ========================================
    const attendancePercentage = attendanceStats.attendancePercentage;
    
    let attendanceLevel: AttendanceLevel = 'regular';
    let attendanceLabel = 'Pravidelná';
    
    if (attendancePercentage >= 80) {
      attendanceLevel = 'regular';
      attendanceLabel = 'Pravidelná';
    } else if (attendancePercentage >= 50) {
      attendanceLevel = 'fluctuating';
      attendanceLabel = 'Kolísá';
    } else {
      attendanceLevel = 'dropouts';
      attendanceLabel = 'Výpadky';
    }

    // ========================================
    // E) KREDIT
    // ========================================
    let creditLevel: CreditLevel = 'ok';
    let creditLabel = 'OK';
    
    if (creditBalance <= creditThresholds.critical) {
      creditLevel = 'exhausted';
      creditLabel = 'Vyčerpaný';
    } else if (creditBalance < creditThresholds.warning) {
      creditLevel = 'low';
      creditLabel = 'Nízký';
    }

    // ========================================
    // LAST DATA
    // ========================================
    const lastFeedback = feedback[0];
    const lastCompletedTraining = sessions.find(s => s.status === 'completed');

    return {
      trainingLoadTrend,
      trainingLoadLabel,
      feedbackTrend,
      feedbackTrendLabel,
      recurringPain,
      attendanceLevel,
      attendancePercentage,
      attendanceLabel,
      creditLevel,
      creditLabel,
      lastFeedbackId: lastFeedback?.id,
      lastTrainingId: lastCompletedTraining?.id,
      lastFeedbackDate: lastFeedback?.created_at,
      lastTrainingDate: lastCompletedTraining?.date,
      hasEnoughData: completedSessions.length >= 2 || feedback.length >= 1,
    };
  }, [sessions, feedback, attendanceStats, creditBalance, creditThresholds]);

  return {
    ...snapshot,
    isLoading: sessionsLoading || feedbackLoading || attendanceLoading,
  };
}

// Helper to translate pain area names
export function translatePainArea(area: string): string {
  const translations: Record<string, string> = {
    neck: 'Krk',
    shoulder: 'Rameno',
    upper_back: 'Horní záda',
    lower_back: 'Bederní páteř',
    hip: 'Kyčel',
    knee: 'Koleno',
    ankle: 'Kotník',
    elbow: 'Loket',
    wrist: 'Zápěstí',
    chest: 'Hrudník',
    abdomen: 'Břicho',
    groin: 'Tříslo',
    thigh: 'Stehno',
    calf: 'Lýtko',
    foot: 'Chodidlo',
  };
  return translations[area] || area;
}
