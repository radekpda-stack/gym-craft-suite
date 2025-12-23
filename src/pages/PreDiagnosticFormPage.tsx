import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PreDiagnosticFormContent } from '@/components/pre-diagnostic/PreDiagnosticFormContent';
import { PreDiagnosticComplete } from '@/components/pre-diagnostic/PreDiagnosticComplete';
import { PreDiagnosticExpired } from '@/components/pre-diagnostic/PreDiagnosticExpired';
import { PreDiagnosticLoading } from '@/components/pre-diagnostic/PreDiagnosticLoading';

export interface PreDiagnosticFormData {
  // Basic context
  age?: number;
  height?: number;
  weight?: number;
  daily_activity_type?: 'sedentary' | 'combined' | 'physical';
  
  // Movement activity
  movement_experience?: string;
  current_activities?: string[];
  current_activities_other?: string;
  movement_frequency?: string;
  feeling_after_movement?: string;
  
  // Pain & restrictions
  has_pain?: boolean;
  pain_areas?: string[];
  pain_type?: string;
  pain_frequency?: string;
  pain_limitation?: string;
  
  // Health
  has_injury?: boolean;
  injury_details?: string;
  has_surgery?: boolean;
  surgery_details?: string;
  takes_medication?: boolean;
  medication_details?: string;
  has_movement_concerns?: boolean;
  movement_concerns?: string;
  health_notes?: string;
  
  // Sleep & regeneration
  sleep_hours_avg?: string;
  sleep_quality?: string;
  
  // Goals
  main_goal?: string;
  main_goal_other?: string;
  priorities?: string[];
  training_preferences?: string;
  training_dislikes?: string;
  
  // Open question
  open_question?: string;
  
  // New client identification
  name?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female';
  birth_date?: string;
}

interface FormState {
  id: string;
  status: 'pending' | 'draft' | 'completed';
  source: 'new_client' | 'existing_client';
  client: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function PreDiagnosticFormPage() {
  const { token } = useParams<{ token: string }>();
  
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [formData, setFormData] = useState<PreDiagnosticFormData>({});
  const [isExpired, setIsExpired] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Determine if this is a new client based on formState (after loading)
  const isNewClientMode = formState?.source === 'new_client';

  // Load form data
  useEffect(() => {
    const loadForm = async () => {
      if (!token) {
        toast.error('Chybí token formuláře');
        setLoading(false);
        return;
      }

      try {
        console.log('Loading form with token:', token);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pre-diagnostic-form/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();
        console.log('Form load response:', result);

        if (!response.ok) {
          if (result.expired) {
            setIsExpired(true);
          } else if (result.completed) {
            setIsCompleted(true);
          } else {
            toast.error(result.error || 'Formulář nenalezen');
          }
          setLoading(false);
          return;
        }

        setFormState(result.form);
        setFormData(result.answers || {});
        
        // Pre-fill from client data if exists
        if (result.form.client) {
          setFormData(prev => ({
            ...prev,
            name: result.form.client.name,
            email: result.form.client.email,
            phone: result.form.client.phone,
            gender: result.form.client.gender,
            birth_date: result.form.client.birth_date,
          }));
        }
      } catch (error) {
        console.error('Error loading form:', error);
        toast.error('Nepodařilo se načíst formulář');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [token]);

  // Autosave handler
  const handleAutosave = useCallback(async (data: PreDiagnosticFormData) => {
    if (!formState?.id || isCompleted) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pre-diagnostic-form/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'autosave',
            formId: formState.id,
            answers: data,
          }),
        }
      );

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Autosave error:', error);
    }
  }, [formState?.id, token, isCompleted]);

  // Submit handler
  const handleSubmit = async (data: PreDiagnosticFormData) => {
    if (!formState?.id) {
      toast.error('Formulář není inicializován');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pre-diagnostic-form/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'submit',
            formId: formState.id,
            answers: data,
            newClientData: isNewClientMode ? {
              name: data.name,
              email: data.email,
              phone: data.phone,
            } : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Odeslání selhalo');
      }

      setIsCompleted(true);
      toast.success('Formulář byl úspěšně odeslán');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Nepodařilo se odeslat formulář');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set noindex meta tag
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Pre-diagnostický formulář';
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  if (loading) {
    return <PreDiagnosticLoading />;
  }

  if (isExpired) {
    return <PreDiagnosticExpired />;
  }

  if (isCompleted) {
    return <PreDiagnosticComplete />;
  }

  return (
    <PreDiagnosticFormContent
      formData={formData}
      setFormData={setFormData}
      onAutosave={handleAutosave}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      lastSaved={lastSaved}
      isNewClient={isNewClientMode}
      clientName={formState?.client?.name}
    />
  );
}
