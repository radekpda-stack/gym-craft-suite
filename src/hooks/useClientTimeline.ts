import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TimelineEventType = 
  | 'training_completed'
  | 'training_scheduled'
  | 'training_cancelled'
  | 'feedback_received'
  | 'feedback_requested'
  | 'measurement'
  | 'diagnostic'
  | 'credit_change'
  | 'note_added'
  | 'media_uploaded';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isRedFlag?: boolean;
  relatedId?: string;
}

export interface TimelineOptions {
  limit?: number;
  daysBack?: number;
}

export function useClientTimeline(clientId: string | undefined, options?: TimelineOptions) {
  return useQuery({
    queryKey: ['client-timeline', clientId, options?.limit, options?.daysBack],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!clientId) return [];

      const events: TimelineEvent[] = [];
      
      // Calculate date filter if daysBack is specified
      let dateFilter: string | undefined;
      if (options?.daysBack) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
        dateFilter = cutoffDate.toISOString();
      }

      // Fetch trainings where client is the PAYER (client_id)
      let trainingsQuery = supabase
        .from('training_sessions')
        .select('id, date, status, notes, duration')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(options?.limit || 50);
      
      if (dateFilter) {
        trainingsQuery = trainingsQuery.gte('date', dateFilter);
      }
      
      const { data: trainings } = await trainingsQuery;

      const trainingIds = new Set<string>();

      trainings?.forEach(t => {
        trainingIds.add(t.id);
        const statusMap: Record<string, TimelineEventType> = {
          completed: 'training_completed',
          scheduled: 'training_scheduled',
          cancelled: 'training_cancelled',
        };
        events.push({
          id: `training-${t.id}`,
          type: statusMap[t.status] || 'training_scheduled',
          date: t.date,
          title: t.status === 'completed' ? 'Trénink dokončen' : 
                 t.status === 'cancelled' ? 'Trénink zrušen' : 'Trénink naplánován',
          description: t.notes || undefined,
          metadata: { duration: t.duration, role: 'payer' },
          relatedId: t.id,
        });
      });

      // Fetch trainings where client is a PARTICIPANT (but not payer)
      let participationsQuery = supabase
        .from('training_participants')
        .select('training_session_id, training_sessions(id, date, status, notes, duration, clients(name))')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);
      
      const { data: participations } = await participationsQuery;

      participations?.forEach(p => {
        const session = p.training_sessions as any;
        if (!session || trainingIds.has(session.id)) return; // Skip if already added as payer
        
        if (dateFilter && new Date(session.date) < new Date(dateFilter)) return;
        
        const statusMap: Record<string, TimelineEventType> = {
          completed: 'training_completed',
          scheduled: 'training_scheduled',
          cancelled: 'training_cancelled',
        };
        events.push({
          id: `training-participant-${session.id}`,
          type: statusMap[session.status] || 'training_scheduled',
          date: session.date,
          title: session.status === 'completed' ? 'Trénink dokončen' : 
                 session.status === 'cancelled' ? 'Trénink zrušen' : 'Trénink naplánován',
          description: session.clients?.name ? `Hradí: ${session.clients.name}` : (session.notes || undefined),
          metadata: { duration: session.duration, role: 'participant' },
          relatedId: session.id,
        });
      });

      // Fetch feedback
      let feedbackQuery = supabase
        .from('training_feedback')
        .select('id, training_date, pain, body_feel, energy_rating, is_red_flag, red_flag_reasons, comment')
        .eq('client_id', clientId)
        .order('training_date', { ascending: false })
        .limit(options?.limit || 50);
      
      if (dateFilter) {
        feedbackQuery = feedbackQuery.gte('training_date', dateFilter);
      }
      
      const { data: feedbacks } = await feedbackQuery;

      feedbacks?.forEach(f => {
        events.push({
          id: `feedback-${f.id}`,
          type: 'feedback_received',
          date: f.training_date,
          title: 'Feedback doručen',
          description: f.comment || undefined,
          metadata: { pain: f.pain, body_feel: f.body_feel, energy: f.energy_rating },
          isRedFlag: f.is_red_flag,
          relatedId: f.id,
        });
      });

      // Fetch measurements
      let measurementsQuery = supabase
        .from('measurements')
        .select('id, date, weight, body_fat_percentage, muscle_mass')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(options?.limit || 20);
      
      if (dateFilter) {
        measurementsQuery = measurementsQuery.gte('date', dateFilter);
      }
      
      const { data: measurements } = await measurementsQuery;

      measurements?.forEach(m => {
        const parts: string[] = [];
        if (m.weight) parts.push(`${m.weight} kg`);
        if (m.body_fat_percentage) parts.push(`${m.body_fat_percentage}% tuk`);
        if (m.muscle_mass) parts.push(`${m.muscle_mass} kg sval`);
        
        events.push({
          id: `measurement-${m.id}`,
          type: 'measurement',
          date: m.date,
          title: 'Měření',
          description: parts.join(' • ') || undefined,
          relatedId: m.id,
        });
      });

      // Fetch credit transactions
      let transactionsQuery = supabase
        .from('credit_transactions')
        .select('id, created_at, amount, type, description')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 30);
      
      if (dateFilter) {
        transactionsQuery = transactionsQuery.gte('created_at', dateFilter);
      }
      
      const { data: transactions } = await transactionsQuery;

      transactions?.forEach(t => {
        events.push({
          id: `credit-${t.id}`,
          type: 'credit_change',
          date: t.created_at,
          title: t.amount > 0 ? 'Dobití kreditu' : 'Odečet kreditu',
          description: t.description || `${t.amount > 0 ? '+' : ''}${t.amount} Kč`,
          metadata: { amount: t.amount, type: t.type },
          relatedId: t.id,
        });
      });

      // Fetch diagnostics
      let diagnosticsQuery = supabase
        .from('diagnostics')
        .select('id, date, area_name, area_type, findings')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(options?.limit || 20);
      
      if (dateFilter) {
        diagnosticsQuery = diagnosticsQuery.gte('date', dateFilter);
      }
      
      const { data: diagnostics } = await diagnosticsQuery;

      diagnostics?.forEach(d => {
        events.push({
          id: `diagnostic-${d.id}`,
          type: 'diagnostic',
          date: d.date,
          title: `Diagnostika: ${d.area_name}`,
          description: d.findings?.substring(0, 100) || undefined,
          metadata: { area_type: d.area_type },
          relatedId: d.id,
        });
      });

      // Fetch media uploads
      let mediaQuery = supabase
        .from('client_media')
        .select('id, created_at, file_name, type, category, description')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 20);
      
      if (dateFilter) {
        mediaQuery = mediaQuery.gte('created_at', dateFilter);
      }
      
      const { data: media } = await mediaQuery;

      media?.forEach(m => {
        const typeLabel = m.type === 'image' ? 'Fotka' : m.type === 'video' ? 'Video' : 'Soubor';
        events.push({
          id: `media-${m.id}`,
          type: 'media_uploaded',
          date: m.created_at,
          title: `${typeLabel} nahráno`,
          description: m.description || m.category || m.file_name,
          metadata: { type: m.type, category: m.category },
          relatedId: m.id,
        });
      });

      // Sort all events by date descending
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return options?.limit ? events.slice(0, options.limit) : events;
    },
    enabled: !!clientId,
  });
}
