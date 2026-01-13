import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientTrend {
  clientId: string;
  clientName: string;
  issues: string[];
  reasons: string[]; // Specific data-driven reasons
  lastFeedbackDate: string;
  severity: 'warning' | 'critical';
  redFlagCount14Days: number;
  complianceRate: number | null; // percentage of filled feedbacks
  // New fields for enhanced analytics
  enjoymentDecline?: boolean;
  sleepIssues?: boolean;
  recurringPainAreas?: string[];
}

export function useFeedbackTrends() {
  return useQuery({
    queryKey: ['feedback-trends'],
    queryFn: async () => {
      // Get all clients with recent feedback
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_archived', false);

      if (clientsError) throw clientsError;

      const trendsWithIssues: ClientTrend[] = [];
      const now = new Date();
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Check each client's last 3 feedbacks
      for (const client of clients || []) {
        const { data: feedbacks } = await supabase
          .from('training_feedback')
          .select('pain, body_feel, soreness, energy_rating, fun, training_date, is_red_flag')
          .eq('client_id', client.id)
          .order('training_date', { ascending: false })
          .limit(10);

        if (!feedbacks || feedbacks.length < 3) continue;

        const last3 = feedbacks.slice(0, 3);
        const issues: string[] = [];
        const reasons: string[] = [];
        let severity: 'warning' | 'critical' = 'warning';

        // Count red flags in last 14 days
        const redFlagCount14Days = feedbacks.filter(f => 
          f.is_red_flag && 
          new Date(f.training_date) >= fourteenDaysAgo
        ).length;

        // Get compliance (feedback requests vs completed)
        const { count: sentCount } = await supabase
          .from('feedback_requests')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', fourteenDaysAgo.toISOString());

        const { count: completedCount } = await supabase
          .from('feedback_requests')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .gte('created_at', fourteenDaysAgo.toISOString());

        const complianceRate = sentCount && sentCount > 0 
          ? Math.round((completedCount || 0) / sentCount * 100) 
          : null;

        // Check for repeated high pain (>= 5 for 3 sessions)
        const highPainCount = last3.filter(f => f.pain && f.pain >= 5).length;
        if (highPainCount >= 3) {
          issues.push('Opakovaná bolest');
          const avgPain = last3.reduce((sum, f) => sum + (f.pain || 0), 0) / 3;
          reasons.push(`Bolest ↑ poslední 3 feedbacky (Ø ${avgPain.toFixed(1)})`);
          if (last3.some(f => f.pain && f.pain >= 7)) severity = 'critical';
        }

        // Check for repeated low body feel (<= 4 for 3 sessions)
        const lowBodyFeelCount = last3.filter(f => f.body_feel && f.body_feel <= 4).length;
        if (lowBodyFeelCount >= 3) {
          issues.push('Nízký pocit v těle');
          const avgBodyFeel = last3.reduce((sum, f) => sum + (f.body_feel || 0), 0) / 3;
          reasons.push(`Pocit v těle ↓ poslední 3 feedbacky (Ø ${avgBodyFeel.toFixed(1)})`);
          if (last3.some(f => f.body_feel && f.body_feel <= 2)) severity = 'critical';
        }

        // Check for repeated high soreness (>= 6 for 3 sessions)
        const highSorenessCount = last3.filter(f => f.soreness && f.soreness >= 6).length;
        if (highSorenessCount >= 3) {
          issues.push('Vysoká únava');
          const avgSoreness = last3.reduce((sum, f) => sum + (f.soreness || 0), 0) / 3;
          reasons.push(`Svalovka ↑ poslední 3 feedbacky (Ø ${avgSoreness.toFixed(1)})`);
        }

        // Check for repeated low energy (<= 4 for 3 sessions)
        const lowEnergyCount = last3.filter(f => f.energy_rating && f.energy_rating <= 4).length;
        if (lowEnergyCount >= 3) {
          issues.push('Nízká energie');
          const avgEnergy = last3.reduce((sum, f) => sum + (f.energy_rating || 0), 0) / 3;
          reasons.push(`Energie ↓ poslední 3 feedbacky (Ø ${avgEnergy.toFixed(1)})`);
        }

        // Check for repeated low fun (<= 4 for 3 sessions) - ENJOYMENT DECLINE
        const lowFunCount = last3.filter(f => f.fun && f.fun <= 4).length;
        let enjoymentDecline = false;
        if (lowFunCount >= 3) {
          issues.push('Nízká motivace');
          reasons.push(`Zábava ↓ poslední 3 feedbacky`);
          enjoymentDecline = true;
        }

        // Check for declining fun trend (compare last 3 vs previous 3)
        if (!enjoymentDecline && feedbacks.length >= 6) {
          const prev3 = feedbacks.slice(3, 6);
          const last3Fun = last3.filter(f => f.fun != null).map(f => f.fun!);
          const prev3Fun = prev3.filter(f => f.fun != null).map(f => f.fun!);
          if (last3Fun.length >= 2 && prev3Fun.length >= 2) {
            const last3Avg = last3Fun.reduce((a, b) => a + b, 0) / last3Fun.length;
            const prev3Avg = prev3Fun.reduce((a, b) => a + b, 0) / prev3Fun.length;
            if (prev3Avg - last3Avg >= 2) {
              issues.push('Klesající motivace');
              reasons.push(`Zábava klesla z ${prev3Avg.toFixed(1)} na ${last3Avg.toFixed(1)}`);
              enjoymentDecline = true;
            }
          }
        }

        // Check for sleep issues (poor sleep in recent feedbacks)
        let sleepIssues = false;
        const poorSleepCount = feedbacks.slice(0, 5).filter(f => 
          (f as any).sleep_after === 'poor'
        ).length;
        if (poorSleepCount >= 2) {
          sleepIssues = true;
          if (!issues.includes('Problémy se spánkem')) {
            issues.push('Problémy se spánkem');
            reasons.push(`${poorSleepCount}× špatný spánek za posledních 5 tréninků`);
          }
        }

        // Add red flag reason if applicable
        if (redFlagCount14Days >= 2) {
          if (!issues.includes('Red flags')) issues.push('Red flags');
          reasons.push(`${redFlagCount14Days}× Red flag za 14 dní`);
          severity = 'critical';
        }

        // Add compliance reason
        if (complianceRate !== null && complianceRate < 50) {
          reasons.push(`Nízká compliance (${complianceRate}%)`);
        }

        if (issues.length > 0) {
          trendsWithIssues.push({
            clientId: client.id,
            clientName: client.name,
            issues,
            reasons: reasons.slice(0, 3), // Max 3 reasons (increased from 2)
            lastFeedbackDate: last3[0].training_date,
            severity,
            redFlagCount14Days,
            complianceRate,
            enjoymentDecline,
            sleepIssues,
          });
        }
      }

      // Sort by severity (critical first) and then by date
      return trendsWithIssues.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === 'critical' ? -1 : 1;
        }
        return new Date(b.lastFeedbackDate).getTime() - new Date(a.lastFeedbackDate).getTime();
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
