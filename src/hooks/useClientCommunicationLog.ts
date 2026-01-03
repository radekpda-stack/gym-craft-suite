/**
 * Client Communication Log Hook
 * 
 * Tracks communication with client:
 * - Notes from trainer
 * - Feedback requests sent
 * - Portal logins
 * - Chat messages (if available)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CommunicationType = 'note' | 'feedback_request' | 'portal_login' | 'training_complete' | 'credit_added' | 'package_purchased';

export interface CommunicationEntry {
  id: string;
  date: string;
  type: CommunicationType;
  title: string;
  content: string | null;
  metadata?: Record<string, any>;
}

export interface ClientCommunicationData {
  entries: CommunicationEntry[];
  lastContactDate: string | null;
  daysSinceLastContact: number | null;
  totalNotes: number;
  totalFeedbackRequests: number;
}

export function useClientCommunicationLog(clientId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['client-communication-log', clientId, limit],
    queryFn: async (): Promise<ClientCommunicationData> => {
      if (!clientId) throw new Error('No client ID');

      const entries: CommunicationEntry[] = [];
      const now = new Date();

      // Fetch feedback requests
      const { data: feedbackRequests } = await supabase
        .from('feedback_requests')
        .select('id, created_at, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      feedbackRequests?.forEach(req => {
        entries.push({
          id: `fr-${req.id}`,
          date: req.created_at,
          type: 'feedback_request',
          title: 'Odeslán feedback request',
          content: req.status === 'completed' ? 'Vyplněno' : 'Čeká na odpověď',
        });
      });

      // Fetch portal activity
      const { data: portalActivity } = await supabase
        .from('client_portal_activity')
        .select('id, created_at, activity_type, metadata')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit);

      portalActivity?.forEach(activity => {
        entries.push({
          id: `pa-${activity.id}`,
          date: activity.created_at,
          type: 'portal_login',
          title: activity.activity_type === 'login' ? 'Přihlášení do portálu' : activity.activity_type,
          content: null,
          metadata: activity.metadata as Record<string, any>,
        });
      });

      // Fetch credit transactions (as communication touchpoints)
      const { data: creditTx } = await supabase
        .from('credit_transactions')
        .select('id, created_at, type, amount, description')
        .eq('client_id', clientId)
        .eq('type', 'payment')
        .order('created_at', { ascending: false })
        .limit(10);

      creditTx?.forEach(tx => {
        entries.push({
          id: `tx-${tx.id}`,
          date: tx.created_at,
          type: 'credit_added',
          title: 'Kredit přidán',
          content: `${tx.amount} Kč - ${tx.description || 'Platba'}`,
        });
      });

      // Sort all entries by date
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate metrics
      const lastContactDate = entries[0]?.date || null;
      const daysSinceLastContact = lastContactDate 
        ? Math.floor((now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        entries: entries.slice(0, limit),
        lastContactDate,
        daysSinceLastContact,
        totalNotes: 0, // Would need notes parsing
        totalFeedbackRequests: feedbackRequests?.length || 0,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
