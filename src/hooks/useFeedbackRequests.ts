import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FeedbackRequest {
  id: string;
  user_id: string;
  client_id: string;
  training_session_id: string | null;
  token: string;
  status: 'pending' | 'sent' | 'completed' | 'expired' | 'cancelled';
  custom_message: string | null;
  trainer_signature: string | null;
  expires_at: string;
  sent_at: string | null;
  completed_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; email: string | null };
  training_sessions?: { date: string; notes: string | null };
}

export interface FeedbackQuestion {
  id: string;
  type: 'slider';
  label: string;
  emoji: string;
  minLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  defaultValue: number;
  enabled: boolean;
  order: number;
  helpText?: string;
  showPainAreas?: boolean;
  painAreaThreshold?: number;
}

export interface PainArea {
  id: string;
  label: string;
  enabled: boolean;
}

export interface FeedbackQuestionsConfig {
  questions: FeedbackQuestion[];
  painAreas: PainArea[];
  noteEnabled: boolean;
  noteMaxLength: number;
}

export interface FeedbackSettings {
  id: string;
  user_id: string;
  reminder_intervals: number[];
  expiration_hours: number;
  default_language: string;
  trainer_signature: string | null;
  auto_send_after_training: boolean;
  feedback_questions: FeedbackQuestionsConfig | null;
  red_flag_pain_threshold?: number;
  red_flag_body_feel_threshold?: number;
}

export interface CreateFeedbackRequestInput {
  client_id: string;
  training_session_id?: string;
  custom_message?: string;
  trainer_signature?: string;
  expiration_hours?: number;
}

export function useFeedbackRequests(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feedback-requests', clientId],
    queryFn: async () => {
      let query = supabase
        .from('feedback_requests')
        .select(`
          *,
          clients(name, email),
          training_sessions(date, notes)
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackRequest[];
    },
    enabled: !!user,
  });
}

export function useFeedbackSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['feedback-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        feedback_questions: data.feedback_questions as unknown as FeedbackQuestionsConfig | null,
      } as FeedbackSettings;
    },
    enabled: !!user,
  });

  const upsertSettings = useMutation({
    mutationFn: async (settings: Partial<FeedbackSettings>) => {
      if (!user) throw new Error('Nepřihlášen');

      const { data, error } = await supabase
        .from('feedback_settings')
        .upsert({
          user_id: user.id,
          auto_send_after_training: settings.auto_send_after_training,
          expiration_hours: settings.expiration_hours,
          trainer_signature: settings.trainer_signature,
          default_language: settings.default_language,
          feedback_questions: settings.feedback_questions as unknown as Record<string, unknown>,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-settings'] });
      toast.success('Nastavení uloženo');
    },
    onError: (error) => {
      toast.error(`Chyba: ${error.message}`);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    upsertSettings,
  };
}

export function useCreateFeedbackRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFeedbackRequestInput) => {
      if (!user) throw new Error('Nepřihlášen');

      const expirationHours = input.expiration_hours || 48;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      const { data, error } = await supabase
        .from('feedback_requests')
        .insert({
          user_id: user.id,
          client_id: input.client_id,
          training_session_id: input.training_session_id || null,
          custom_message: input.custom_message || null,
          trainer_signature: input.trainer_signature || null,
          expires_at: expiresAt.toISOString(),
        })
        .select(`
          *,
          clients(name, email),
          training_sessions(date, notes)
        `)
        .single();

      if (error) throw error;
      return data as FeedbackRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
    },
    onError: (error) => {
      toast.error(`Chyba: ${error.message}`);
    },
  });
}

export function useSendFeedbackEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: FeedbackRequest) => {
      if (!request.clients?.email) {
        throw new Error('Klient nemá nastavený e-mail');
      }

      const feedbackUrl = `${window.location.origin}/feedback/${request.token}`;
      
      const trainingDate = request.training_sessions?.date
        ? new Date(request.training_sessions.date).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleDateString('cs-CZ');

      const { data, error } = await supabase.functions.invoke('send-feedback-email', {
        body: {
          requestId: request.id,
          clientEmail: request.clients.email,
          clientName: request.clients.name,
          trainingDate,
          customMessage: request.custom_message,
          trainerSignature: request.trainer_signature,
          feedbackUrl,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
      toast.success('E-mail odeslán');
    },
    onError: (error) => {
      toast.error(`Chyba při odesílání: ${error.message}`);
    },
  });
}

export function useCancelFeedbackRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-requests'] });
      toast.success('Požadavek zrušen');
    },
    onError: (error) => {
      toast.error(`Chyba: ${error.message}`);
    },
  });
}
