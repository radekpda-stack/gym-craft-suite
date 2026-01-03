/**
 * Client Injury History Hook
 * 
 * Tracks injury/pain history from:
 * - Feedback with high pain (>=7)
 * - Health restrictions
 * - Diagnostic data
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InjuryRecord {
  id: string;
  date: string;
  type: 'feedback_pain' | 'health_restriction' | 'diagnostic';
  bodyArea: string | null;
  painLevel: number | null;
  description: string;
  isActive: boolean;
  source: string;
}

export interface ClientInjuryHistoryData {
  injuries: InjuryRecord[];
  activeInjuries: InjuryRecord[];
  hasActiveInjury: boolean;
  mostRecentPainArea: string | null;
  painFrequency: { [area: string]: number };
}

export function useClientInjuryHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-injury-history', clientId],
    queryFn: async (): Promise<ClientInjuryHistoryData> => {
      if (!clientId) throw new Error('No client ID');

      const injuries: InjuryRecord[] = [];
      const painFrequency: { [area: string]: number } = {};

      // Fetch feedback with high pain
      const { data: feedbackData } = await supabase
        .from('training_feedback')
        .select('id, training_date, pain, pain_area, comment')
        .eq('client_id', clientId)
        .gte('pain', 6)
        .order('training_date', { ascending: false })
        .limit(50);

      feedbackData?.forEach(fb => {
        const painLocation = fb.pain_area || 'Nespecifikováno';
        
        injuries.push({
          id: `fb-${fb.id}`,
          date: fb.training_date,
          type: 'feedback_pain',
          bodyArea: painLocation,
          painLevel: fb.pain,
          description: fb.comment || `Bolest ${fb.pain}/10`,
          isActive: false, // Will be determined later
          source: 'Feedback',
        });

        // Track frequency
        painFrequency[painLocation] = (painFrequency[painLocation] || 0) + 1;
      });

      // Fetch client health restrictions
      const { data: clientData } = await supabase
        .from('clients')
        .select('health_restrictions')
        .eq('id', clientId)
        .single();

      if (clientData?.health_restrictions) {
        injuries.push({
          id: 'health-restriction',
          date: new Date().toISOString(),
          type: 'health_restriction',
          bodyArea: null,
          painLevel: null,
          description: clientData.health_restrictions,
          isActive: true,
          source: 'Zdravotní omezení',
        });
      }

      // Determine active injuries (pain in last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const activeInjuries = injuries.filter(inj => {
        if (inj.type === 'health_restriction') return true;
        return new Date(inj.date) >= fourteenDaysAgo;
      });

      // Mark active injuries
      injuries.forEach(inj => {
        if (inj.type === 'health_restriction') {
          inj.isActive = true;
        } else {
          inj.isActive = new Date(inj.date) >= fourteenDaysAgo;
        }
      });

      // Most recent pain area
      const mostRecentPainArea = feedbackData?.[0]?.pain_area || null;

      return {
        injuries,
        activeInjuries,
        hasActiveInjury: activeInjuries.length > 0,
        mostRecentPainArea,
        painFrequency,
      };
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
  });
}
