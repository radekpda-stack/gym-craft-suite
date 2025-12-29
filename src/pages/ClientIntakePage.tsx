import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ClientIntakeForm, ClientIntakeData } from '@/components/pre-diagnostic/ClientIntakeForm';
import { PreDiagnosticComplete } from '@/components/pre-diagnostic/PreDiagnosticComplete';
import { PreDiagnosticExpired } from '@/components/pre-diagnostic/PreDiagnosticExpired';
import { PreDiagnosticLoading } from '@/components/pre-diagnostic/PreDiagnosticLoading';

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

export default function ClientIntakePage() {
  const { token } = useParams<{ token: string }>();
  
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [formData, setFormData] = useState<ClientIntakeData>({});
  const [isExpired, setIsExpired] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
        
        // Map existing answers to new format
        const existingAnswers = result.answers || {};
        const mappedData: ClientIntakeData = {
          ...existingAnswers,
          // Map from old format if needed
          birth_year: existingAnswers.birth_year || (existingAnswers.birth_date ? new Date(existingAnswers.birth_date).getFullYear() : undefined),
          work_type: existingAnswers.work_type || existingAnswers.daily_activity_type,
          sitting_hours: existingAnswers.sitting_hours ?? existingAnswers.sitting_hours_daily,
          movement_frequency: existingAnswers.movement_frequency,
          sleep_hours: existingAnswers.sleep_hours || (existingAnswers.sleep_hours_avg ? parseFloat(existingAnswers.sleep_hours_avg) : undefined),
          has_pain: existingAnswers.has_pain,
          pain_areas: existingAnswers.pain_areas,
        };
        
        setFormData(mappedData);
        
        // Pre-fill from client data if exists
        if (result.form.client) {
          setFormData(prev => ({
            ...prev,
            name: result.form.client.name,
            email: result.form.client.email,
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
  const handleAutosave = useCallback(async (data: ClientIntakeData) => {
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
  const handleSubmit = async (data: ClientIntakeData) => {
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
    document.title = 'Vstupní dotazník';
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
    <ClientIntakeForm
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
