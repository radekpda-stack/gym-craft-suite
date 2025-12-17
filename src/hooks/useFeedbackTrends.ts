import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientTrend {
  clientId: string;
  clientName: string;
  issues: string[];
  lastFeedbackDate: string;
  severity: 'warning' | 'critical';
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

      // Check each client's last 3 feedbacks
      for (const client of clients || []) {
        const { data: feedbacks } = await supabase
          .from('training_feedback')
          .select('pain, body_feel, soreness, energy_rating, fun, training_date')
          .eq('client_id', client.id)
          .order('training_date', { ascending: false })
          .limit(3);

        if (!feedbacks || feedbacks.length < 3) continue;

        const issues: string[] = [];
        let severity: 'warning' | 'critical' = 'warning';

        // Check for repeated high pain (>= 5 for 3 sessions)
        const highPainCount = feedbacks.filter(f => f.pain && f.pain >= 5).length;
        if (highPainCount >= 3) {
          issues.push('Opakovaná bolest');
          if (feedbacks.some(f => f.pain && f.pain >= 7)) severity = 'critical';
        }

        // Check for repeated low body feel (<= 4 for 3 sessions)
        const lowBodyFeelCount = feedbacks.filter(f => f.body_feel && f.body_feel <= 4).length;
        if (lowBodyFeelCount >= 3) {
          issues.push('Nízký pocit v těle');
          if (feedbacks.some(f => f.body_feel && f.body_feel <= 2)) severity = 'critical';
        }

        // Check for repeated high soreness (>= 6 for 3 sessions)
        const highSorenessCount = feedbacks.filter(f => f.soreness && f.soreness >= 6).length;
        if (highSorenessCount >= 3) {
          issues.push('Vysoká únava');
        }

        // Check for repeated low energy (<= 4 for 3 sessions)
        const lowEnergyCount = feedbacks.filter(f => f.energy_rating && f.energy_rating <= 4).length;
        if (lowEnergyCount >= 3) {
          issues.push('Nízká energie');
        }

        // Check for repeated low fun (<= 4 for 3 sessions)
        const lowFunCount = feedbacks.filter(f => f.fun && f.fun <= 4).length;
        if (lowFunCount >= 3) {
          issues.push('Nízká motivace');
        }

        if (issues.length > 0) {
          trendsWithIssues.push({
            clientId: client.id,
            clientName: client.name,
            issues,
            lastFeedbackDate: feedbacks[0].training_date,
            severity,
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
