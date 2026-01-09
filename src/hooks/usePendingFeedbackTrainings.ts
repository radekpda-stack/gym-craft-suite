import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours } from 'date-fns';

export interface PendingFeedbackTraining {
  id: string;
  participant_id: string; // unique key: training_id + client_id
  client_id: string;
  client_name: string;
  date: string;
  hours_since_training: number;
  feedback_request_id?: string;
  feedback_status?: 'not_created' | 'link_copied' | 'sent_pending' | 'completed';
  total_participants: number;
  participant_index: number;
}

export function usePendingFeedbackTrainings() {
  return useQuery({
    queryKey: ['pending-feedback-trainings'],
    queryFn: async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Get completed trainings from last 3 days
      const { data: trainings, error: trainingsError } = await supabase
        .from('training_sessions')
        .select('id, client_id, date')
        .eq('status', 'completed')
        .gte('date', threeDaysAgo.toISOString())
        .order('date', { ascending: false });

      if (trainingsError) throw trainingsError;
      if (!trainings || trainings.length === 0) return [];

      const trainingIds = trainings.map(t => t.id);

      // Get ALL participants for these trainings
      const { data: participants, error: participantsError } = await supabase
        .from('training_participants')
        .select(`
          training_session_id,
          client_id,
          clients!inner (
            id,
            name,
            feedback_enabled
          )
        `)
        .in('training_session_id', trainingIds);

      if (participantsError) throw participantsError;

      // Build participant list per training (including main client if not in participants)
      const trainingParticipantsMap = new Map<string, Array<{ client_id: string; client_name: string }>>();
      
      for (const t of trainings) {
        const participantList: Array<{ client_id: string; client_name: string }> = [];
        
        // Get participants from training_participants table
        const trainingParts = (participants || []).filter(
          (p: any) => p.training_session_id === t.id && p.clients?.feedback_enabled !== false
        );
        
        for (const p of trainingParts) {
          participantList.push({
            client_id: p.client_id,
            client_name: (p as any).clients?.name || 'Neznámý',
          });
        }
        
        // If no participants in table, fallback to main client_id
        if (participantList.length === 0 && t.client_id) {
          // Fetch main client data
          const { data: mainClient } = await supabase
            .from('clients')
            .select('id, name, feedback_enabled')
            .eq('id', t.client_id)
            .single();
          
          if (mainClient && mainClient.feedback_enabled !== false) {
            participantList.push({
              client_id: mainClient.id,
              client_name: mainClient.name || 'Neznámý',
            });
          }
        }
        
        trainingParticipantsMap.set(t.id, participantList);
      }

      // Get existing feedback requests for these trainings
      const { data: requests } = await supabase
        .from('feedback_requests')
        .select('id, training_session_id, client_id, status, sent_at, link_copied_at')
        .in('training_session_id', trainingIds);

      // Map by training_session_id + client_id
      const requestMap = new Map<string, typeof requests extends (infer T)[] ? T : never>();
      for (const r of requests || []) {
        const key = `${r.training_session_id}_${r.client_id}`;
        requestMap.set(key, r);
      }

      // Build result - one row per participant
      const result: PendingFeedbackTraining[] = [];

      for (const t of trainings) {
        const participantList = trainingParticipantsMap.get(t.id) || [];
        const totalParticipants = participantList.length;
        const hoursSince = differenceInHours(now, new Date(t.date));

        participantList.forEach((participant, index) => {
          const requestKey = `${t.id}_${participant.client_id}`;
          const request = requestMap.get(requestKey);

          let feedback_status: PendingFeedbackTraining['feedback_status'] = 'not_created';
          if (request) {
            if (request.status === 'completed') {
              feedback_status = 'completed';
            } else if (request.sent_at) {
              feedback_status = 'sent_pending';
            } else if (request.link_copied_at) {
              feedback_status = 'link_copied';
            } else {
              feedback_status = 'not_created';
            }
          }

          result.push({
            id: t.id,
            participant_id: `${t.id}_${participant.client_id}`,
            client_id: participant.client_id,
            client_name: participant.client_name,
            date: t.date,
            hours_since_training: hoursSince,
            feedback_request_id: request?.id,
            feedback_status,
            total_participants: totalParticipants,
            participant_index: index + 1,
          });
        });
      }

      // Filter out completed ones - we only want pending
      return result.filter(r => r.feedback_status !== 'completed');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
