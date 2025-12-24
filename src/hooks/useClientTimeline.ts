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

export function useClientTimeline(clientId: string | undefined, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['client-timeline', clientId, options?.limit],
    queryFn: async (): Promise<TimelineEvent[]> => {
      if (!clientId) return [];

      const events: TimelineEvent[] = [];

      // Fetch trainings
      const { data: trainings } = await supabase
        .from('training_sessions')
        .select('id, date, status, notes, duration')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(options?.limit || 50);

      trainings?.forEach(t => {
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
          metadata: { duration: t.duration },
          relatedId: t.id,
        });
      });

      // Fetch feedback
      const { data: feedbacks } = await supabase
        .from('training_feedback')
        .select('id, training_date, pain, body_feel, energy_rating, is_red_flag, red_flag_reasons, comment')
        .eq('client_id', clientId)
        .order('training_date', { ascending: false })
        .limit(options?.limit || 50);

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
      const { data: measurements } = await supabase
        .from('measurements')
        .select('id, date, weight, body_fat_percentage, muscle_mass')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(options?.limit || 20);

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
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('id, created_at, amount, type, description')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 30);

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

      // Sort all events by date descending
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return options?.limit ? events.slice(0, options.limit) : events;
    },
    enabled: !!clientId,
  });
}
