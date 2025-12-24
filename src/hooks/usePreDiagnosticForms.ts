import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogMessage } from '@/hooks/useMessageLog';

export interface PreDiagnosticForm {
  id: string;
  token: string;
  client_id: string | null;
  source: string;
  status: string;
  locked: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  client_name?: string | null;
  client_email?: string | null;
  trainer_summary?: string | null;
  trainer_recommendations?: string | null;
  trainer_restrictions?: string | null;
  summary_approved?: boolean;
  approved_at?: string | null;
}

export interface PreDiagnosticAnswer {
  id: string;
  form_id: string;
  field_key: string;
  value: any;
  original_value?: any;
  edited_by_trainer?: boolean;
  edited_at?: string | null;
}

// Fetch all pre-diagnostic forms for the current user
export function usePreDiagnosticForms() {
  return useQuery({
    queryKey: ['pre-diagnostic-forms'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PreDiagnosticForm[];
    },
  });
}

// Fetch unassigned (completed forms from new clients without client_id)
export function useUnassignedPreDiagnostics() {
  return useQuery({
    queryKey: ['pre-diagnostic-forms', 'unassigned'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', 'new_client')
        .eq('status', 'completed')
        .is('client_id', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PreDiagnosticForm[];
    },
  });
}

// Fetch pre-diagnostic for a specific client
export function useClientPreDiagnostic(clientId: string | undefined) {
  return useQuery({
    queryKey: ['pre-diagnostic-forms', 'client', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PreDiagnosticForm | null;
    },
    enabled: !!clientId,
  });
}

// Create a new invite (for new client without client_id)
export function useCreatePreDiagnosticInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique token
      const token = crypto.randomUUID();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .insert({
          user_id: user.id,
          token,
          source: 'new_client',
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as PreDiagnosticForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-forms'] });
    },
    onError: (error) => {
      console.error('Error creating invite:', error);
      toast.error('Nepodařilo se vytvořit pozvánku');
    },
  });
}

// Create invite for existing client
export function useCreateClientPreDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique token
      const token = crypto.randomUUID();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .insert({
          user_id: user.id,
          client_id: clientId,
          token,
          source: 'existing_client',
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as PreDiagnosticForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-forms'] });
      toast.success('Odkaz na pre-diagnostiku byl vytvořen');
    },
    onError: (error) => {
      console.error('Error creating client pre-diagnostic:', error);
      toast.error('Nepodařilo se vytvořit pre-diagnostiku');
    },
  });
}

// Assign unassigned form to existing client
export function useAssignPreDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ formId, clientId }: { formId: string; clientId: string }) => {
      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .update({ client_id: clientId })
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      return data as PreDiagnosticForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-forms'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Pre-diagnostika byla přiřazena ke klientovi');
    },
    onError: (error) => {
      console.error('Error assigning pre-diagnostic:', error);
      toast.error('Nepodařilo se přiřadit pre-diagnostiku');
    },
  });
}

// Fetch answers for a pre-diagnostic form
export function usePreDiagnosticAnswers(formId: string | undefined) {
  return useQuery({
    queryKey: ['pre-diagnostic-answers', formId],
    queryFn: async () => {
      if (!formId) return [];
      
      const { data, error } = await supabase
        .from('pre_diagnostic_answers')
        .select('*')
        .eq('form_id', formId);

      if (error) throw error;
      return data as PreDiagnosticAnswer[];
    },
    enabled: !!formId,
  });
}

// Update a pre-diagnostic answer with history tracking
export function useUpdatePreDiagnosticAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answerId, value }: { answerId: string; value: any }) => {
      // First get the current answer to save history
      const { data: currentAnswer, error: fetchError } = await supabase
        .from('pre_diagnostic_answers')
        .select('*')
        .eq('id', answerId)
        .single();

      if (fetchError) throw fetchError;

      // Save to history
      await supabase
        .from('pre_diagnostic_answer_history')
        .insert({
          answer_id: answerId,
          previous_value: currentAnswer.value,
          new_value: value,
          changed_by: 'trainer',
        });

      // Update the answer with tracking info
      const { data, error } = await supabase
        .from('pre_diagnostic_answers')
        .update({ 
          value,
          original_value: currentAnswer.original_value || currentAnswer.value,
          edited_by_trainer: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', answerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-answers'] });
      toast.success('Odpověď byla aktualizována');
    },
    onError: (error) => {
      console.error('Error updating pre-diagnostic answer:', error);
      toast.error('Nepodařilo se aktualizovat odpověď');
    },
  });
}

// Update trainer summary
export function useUpdateTrainerSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      formId, 
      summary, 
      recommendations, 
      restrictions 
    }: { 
      formId: string; 
      summary?: string; 
      recommendations?: string; 
      restrictions?: string;
    }) => {
      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .update({ 
          trainer_summary: summary,
          trainer_recommendations: recommendations,
          trainer_restrictions: restrictions,
        })
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      return data as PreDiagnosticForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-forms'] });
      toast.success('Souhrn byl uložen');
    },
    onError: (error) => {
      console.error('Error updating trainer summary:', error);
      toast.error('Nepodařilo se uložit souhrn');
    },
  });
}

// Approve summary for client
export function useApproveSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { data, error } = await supabase
        .from('pre_diagnostic_forms')
        .update({ 
          summary_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      return data as PreDiagnosticForm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-diagnostic-forms'] });
      toast.success('Souhrn byl schválen');
    },
    onError: (error) => {
      console.error('Error approving summary:', error);
      toast.error('Nepodařilo se schválit souhrn');
    },
  });
}
