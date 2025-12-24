import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ClientFormValues } from "@/lib/validations/client";
import { featureTracker } from "@/hooks/useFeatureTracking";
import { useDemoMode } from "@/contexts/DemoContext";
import { useClientLimit } from "@/hooks/useClientLimit";

export type PaymentMode = 'credit' | 'cash_only' | 'mixed';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  training_goals: string[];
  notes: string;
  health_restrictions: string;
  credit_balance: number;
  birth_date: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  feedback_enabled: boolean;
  gender: 'male' | 'female' | null;
  payment_mode: PaymentMode;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  // Extended personal data fields
  handedness: string | null;
  occupation: string | null;
  sitting_hours_daily: number | null;
  sports_history: string | null;
  current_activities: string[] | null;
  sleep_hours: number | null;
  stress_level: number | null;
  dietary_restrictions: string[] | null;
  supplements: string[] | null;
}

export function useClients() {
  const { isDemo, demoClient } = useDemoMode();
  
  return useQuery({
    queryKey: ["clients", isDemo],
    queryFn: async () => {
      // In demo mode, return demo client data
      if (isDemo && demoClient) {
        return [{
          id: demoClient.id,
          name: demoClient.name,
          email: demoClient.email,
          phone: demoClient.phone,
          training_goals: demoClient.training_goals,
          notes: demoClient.notes,
          health_restrictions: demoClient.health_restrictions,
          credit_balance: demoClient.credit_balance,
          birth_date: demoClient.birth_date,
          is_favorite: demoClient.is_favorite,
          is_archived: demoClient.is_archived,
          feedback_enabled: true,
          gender: demoClient.gender as 'male' | 'female' | null,
          payment_mode: 'credit' as PaymentMode,
          created_at: demoClient.created_at,
          updated_at: demoClient.updated_at,
          user_id: 'demo-admin-0001',
        }] as Client[];
      }
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { isDemo, canCreateClient } = useDemoMode();

  return useMutation({
    mutationFn: async (values: ClientFormValues & { skipLimitCheck?: boolean }) => {
      // Block in demo mode if limit reached
      if (isDemo && !canCreateClient) {
        throw new Error("DEMO_LIMIT: V demo režimu lze vytvořit pouze 1 klienta.");
      }
      
      // In demo mode, simulate creation without DB
      if (isDemo) {
        return {
          id: 'demo-new-client',
          name: values.name,
          email: values.email,
          phone: values.phone,
          created_at: new Date().toISOString(),
        };
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check client limit before creating (unless explicitly skipped)
      if (!values.skipLimitCheck) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_limit')
          .eq('id', user.id)
          .single();

        const clientLimit = profile?.client_limit ?? 5;

        const { count } = await supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_archived', false);

        if ((count ?? 0) >= clientLimit) {
          throw new Error(`CLIENT_LIMIT: Dosáhli jste limitu ${clientLimit} aktivních klientů. Pro navýšení limitu kontaktujte podporu.`);
        }
      }

      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          training_goals: values.trainingGoals,
          notes: values.notes || "",
          health_restrictions: values.healthRestrictions || "",
          credit_balance: values.creditBalance || 0,
          birth_date: values.birthDate || null,
          gender: values.gender || null,
          handedness: values.handedness || null,
          occupation: values.occupation || null,
          sitting_hours_daily: values.sitting_hours_daily || null,
          sports_history: values.sports_history || null,
          current_activities: values.current_activities || null,
          sleep_hours: values.sleep_hours || null,
          stress_level: values.stress_level || null,
          dietary_restrictions: values.dietary_restrictions || null,
          supplements: values.supplements || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('client_create', 'clients');
      toast({
        title: "Klient vytvořen",
        description: "Nový klient byl úspěšně přidán.",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating client:", error);
      
      // Handle client limit error with specific message
      if (error.message.startsWith('CLIENT_LIMIT:')) {
        toast({
          title: "Limit klientů dosažen",
          description: error.message.replace('CLIENT_LIMIT: ', ''),
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit klienta. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClientFormValues }) => {
      const updateData: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        training_goals: values.trainingGoals,
        notes: values.notes || "",
        health_restrictions: values.healthRestrictions || "",
        credit_balance: values.creditBalance || 0,
        birth_date: values.birthDate || null,
        gender: values.gender || null,
      };

      // Only update created_at if it's provided (for editing creation date)
      if (values.createdAt) {
        updateData.created_at = new Date(values.createdAt).toISOString();
      }

      const { data, error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
      featureTracker.track('client_update', 'clients');
      toast({
        title: "Klient aktualizován",
        description: "Údaje klienta byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat klienta.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track('client_delete', 'clients');
      toast({
        title: "Klient smazán",
        description: "Klient byl úspěšně odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat klienta.",
        variant: "destructive",
      });
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_archived }: { id: string; is_archived: boolean }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ is_archived })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      featureTracker.track(data.is_archived ? 'client_archive' : 'client_unarchive', 'clients');
      toast({
        title: data.is_archived ? "Klient archivován" : "Klient obnoven",
        description: data.is_archived 
          ? "Klient byl přesunut do archivu." 
          : "Klient byl obnoven z archivu.",
      });
    },
    onError: (error) => {
      console.error("Error archiving client:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se archivovat klienta.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateClientFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, feedback_enabled }: { id: string; feedback_enabled: boolean }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ feedback_enabled })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
      toast({
        title: data.feedback_enabled ? "Feedback povolen" : "Feedback zakázán",
        description: data.feedback_enabled 
          ? "Klientovi bude možné posílat feedback dotazníky." 
          : "Klientovi nebude zasílán feedback dotazník.",
      });
    },
    onError: (error) => {
      console.error("Error updating client feedback:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat nastavení feedbacku.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePaymentMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payment_mode }: { id: string; payment_mode: PaymentMode }) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ payment_mode })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["credit-signal-stats"] });
      
      const modeLabels: Record<PaymentMode, string> = {
        credit: 'Kredit',
        cash_only: 'Hotovost',
        mixed: 'Kombinovaně',
      };
      
      toast({
        title: "Platební režim změněn",
        description: `Nový režim: ${modeLabels[variables.payment_mode]}`,
      });
    },
    onError: (error) => {
      console.error("Error updating payment mode:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit platební režim.",
        variant: "destructive",
      });
    },
  });
}
