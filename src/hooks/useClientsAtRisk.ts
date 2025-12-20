import { useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { differenceInDays, subMonths, startOfMonth } from 'date-fns';

export interface ClientAtRisk {
  id: string;
  name: string;
  riskScore: number; // 0-100, higher = more at risk
  riskFactors: string[];
  daysSinceLastTraining: number | null;
  trainingsThisMonth: number;
  trainingsLastMonth: number;
  trainingTrend: number; // negative = declining
}

export function useClientsAtRisk() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: sessions = [], isLoading: sessionsLoading } = useTrainingSessions();

  const isLoading = clientsLoading || sessionsLoading;

  const clientsAtRisk = useMemo<ClientAtRisk[]>(() => {
    if (clients.length === 0) return [];

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const twoMonthsAgoStart = startOfMonth(subMonths(now, 2));

    const activeClients = clients.filter(c => !c.is_archived);
    
    const riskClients: ClientAtRisk[] = activeClients.map(client => {
      const clientSessions = sessions.filter(s => s.client_id === client.id);
      const completedSessions = clientSessions.filter(s => s.status === 'completed');
      
      // Sort by date descending
      const sortedSessions = [...completedSessions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Days since last training
      const lastSession = sortedSessions[0];
      const daysSinceLastTraining = lastSession 
        ? differenceInDays(now, new Date(lastSession.date))
        : null;

      // Trainings this month vs last month
      const trainingsThisMonth = completedSessions.filter(s => {
        const d = new Date(s.date);
        return d >= thisMonthStart;
      }).length;

      const trainingsLastMonth = completedSessions.filter(s => {
        const d = new Date(s.date);
        return d >= lastMonthStart && d < thisMonthStart;
      }).length;

      const trainingsTwoMonthsAgo = completedSessions.filter(s => {
        const d = new Date(s.date);
        return d >= twoMonthsAgoStart && d < lastMonthStart;
      }).length;

      // Calculate trend (compare this month to average of last 2 months)
      const avgPreviousMonths = (trainingsLastMonth + trainingsTwoMonthsAgo) / 2;
      const trainingTrend = trainingsThisMonth - avgPreviousMonths;

      // Risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Factor 1: Long time since last training
      if (daysSinceLastTraining !== null) {
        if (daysSinceLastTraining > 30) {
          riskFactors.push(`${daysSinceLastTraining} dní bez tréninku`);
          riskScore += Math.min(40, daysSinceLastTraining);
        } else if (daysSinceLastTraining > 14) {
          riskFactors.push(`${daysSinceLastTraining} dní od posledního tréninku`);
          riskScore += daysSinceLastTraining;
        }
      } else if (completedSessions.length === 0) {
        riskFactors.push('Žádný dokončený trénink');
        riskScore += 30;
      }

      // Factor 2: Declining training frequency
      if (trainingTrend < -2) {
        riskFactors.push(`Pokles aktivity (${Math.abs(Math.round(trainingTrend))} méně tréninků)`);
        riskScore += Math.abs(trainingTrend) * 5;
      }

      // Factor 3: Very low activity this month
      if (trainingsThisMonth === 0 && trainingsLastMonth > 0) {
        riskFactors.push('Žádný trénink tento měsíc');
        riskScore += 20;
      }

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      return {
        id: client.id,
        name: client.name,
        riskScore,
        riskFactors,
        daysSinceLastTraining,
        trainingsThisMonth,
        trainingsLastMonth,
        trainingTrend,
      };
    });

    // Filter clients with risk score > 20 and sort by risk score
    return riskClients
      .filter(c => c.riskScore > 20)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }, [clients, sessions]);

  return { data: clientsAtRisk, isLoading };
}
