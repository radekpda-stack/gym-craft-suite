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
  name: string; // Full display name (legacy, computed from first_name + last_name)
  first_name: string | null; // Křestní jméno
  last_name: string | null; // Příjmení
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
  training_start_date: string | null;
  // Custom pricing
  custom_training_price: number | null;
  custom_price_note: string | null;
  custom_price_credit_limit: number | null;
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
  // Pre-diagnostic data fields
  height: number | null;
  weight: number | null;
  sleep_quality: string | null;
  pain_areas: string[] | null;
  injury_history: string | null;
  surgery_history: string | null;
  movement_frequency: string | null;
  daily_activity_type: string | null;
  training_dislikes: string[] | null;
  // Price transition fields
  grandfathered_credit: number | null;
  grandfathered_at: string | null;
  use_legacy_pricing: boolean;
}

export function useClients() {
  const { isDemo, demoClient } = useDemoMode();
  
  return useQuery({
    queryKey: ["clients", isDemo],
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      // In demo mode, return demo client data
      if (isDemo && demoClient) {
        return [{
          id: demoClient.id,
          name: demoClient.name,
          first_name: demoClient.name.split(' ')[0] || null,
          last_name: demoClient.name.split(' ').slice(1).join(' ') || null,
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
          training_start_date: (demoClient as any).training_start_date ?? null,
        }] as Client[];
      }
      
      // Fetch clients and ledger balances in parallel
      const [clientsResult, ledgerResult] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, first_name, last_name, email, phone, training_goals, notes, health_restrictions, credit_balance, birth_date, is_favorite, is_archived, feedback_enabled, gender, payment_mode, created_at, updated_at, user_id, training_start_date, custom_training_price, custom_price_note, custom_price_credit_limit, handedness, occupation, sitting_hours_daily, sports_history, current_activities, sleep_hours, stress_level, dietary_restrictions, supplements, height, weight, sleep_quality, pain_areas, injury_history, surgery_history, movement_frequency, daily_activity_type, training_dislikes, grandfathered_credit, grandfathered_at, use_legacy_pricing")
          .order("is_favorite", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("vw_client_ledger_balances")
          .select("client_id, ledger_balance")
      ]);

      if (clientsResult.error) throw clientsResult.error;
      
      // Create a map of client_id -> ledger_balance
      const ledgerMap = new Map<string, number>();
      if (ledgerResult.data) {
        for (const row of ledgerResult.data) {
          ledgerMap.set(row.client_id, row.ledger_balance ?? 0);
        }
      }
      
      // Merge clients with their actual credit balance from ledger
      const clientsWithBalance = (clientsResult.data || []).map(client => ({
        ...client,
        // Use ledger balance if available, otherwise fall back to stored credit_balance
        credit_balance: ledgerMap.has(client.id) 
          ? ledgerMap.get(client.id)! 
          : (client.credit_balance || 0),
      }));
      
      return clientsWithBalance as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      
      // Fetch client data and ledger balance in parallel
      const [clientResult, ledgerResult] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("vw_client_ledger_balances")
          .select("ledger_balance")
          .eq("client_id", id)
          .maybeSingle()
      ]);

      if (clientResult.error) throw clientResult.error;
      if (!clientResult.data) return null;
      
      // Use ledger balance if available, otherwise fall back to stored credit_balance
      const actualBalance = ledgerResult.data?.ledger_balance ?? clientResult.data.credit_balance ?? 0;
      
      return {
        ...clientResult.data,
        credit_balance: actualBalance,
      } as Client;
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
          name: `${values.first_name} ${values.last_name}`.trim(),
          first_name: values.first_name,
          last_name: values.last_name,
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
          name: `${values.first_name} ${values.last_name}`.trim(),
          first_name: values.first_name,
          last_name: values.last_name,
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
      // Handle client limit error with specific message
      if (error.message.startsWith('CLIENT_LIMIT:')) {
        toast({
          title: "Limit klientů dosažen",
          description: error.message.replace('CLIENT_LIMIT: ', ''),
          variant: "destructive",
        });
        return;
      }
      
      // Handle demo limit error
      if (error.message.startsWith('DEMO_LIMIT:')) {
        toast({
          title: "Demo limit",
          description: error.message.replace('DEMO_LIMIT: ', ''),
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

/**
 * Partial update mutation for clients.
 * IMPORTANT: Only updates fields that are explicitly provided (not undefined).
 * This prevents accidental overwrites of credit_balance and other fields.
 */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...rest }: { 
      id: string; 
      values?: Partial<ClientFormValues> & { training_start_date?: string | null };
      custom_training_price?: number | null;
      custom_price_note?: string | null;
      custom_price_credit_limit?: number | null;
    }) => {
      const values = rest.values || {};
      const hasCustomPriceUpdate = 'custom_training_price' in rest;
      const updateData: Record<string, unknown> = {};

      // Only add fields that are explicitly provided (not undefined)
      // Handle first_name and last_name separately, and compute name from them
      if (values.first_name !== undefined) updateData.first_name = values.first_name;
      if (values.last_name !== undefined) updateData.last_name = values.last_name;
      // If either name part is updated, recompute the full name
      if (values.first_name !== undefined || values.last_name !== undefined) {
        const firstName = values.first_name ?? '';
        const lastName = values.last_name ?? '';
        updateData.name = `${firstName} ${lastName}`.trim();
      }
      if (values.email !== undefined) updateData.email = values.email;
      if (values.phone !== undefined) updateData.phone = values.phone || null;
      if (values.trainingGoals !== undefined) updateData.training_goals = values.trainingGoals;
      if (values.notes !== undefined) updateData.notes = values.notes || "";
      if (values.healthRestrictions !== undefined) updateData.health_restrictions = values.healthRestrictions || "";
      if (values.birthDate !== undefined) updateData.birth_date = values.birthDate || null;
      if (values.gender !== undefined) updateData.gender = values.gender || null;
      if (values.feedbackEnabled !== undefined) updateData.feedback_enabled = values.feedbackEnabled;
      
      // CRITICAL: Only update credit_balance if explicitly provided
      // This prevents accidental overwrites when updating other fields
      if (values.creditBalance !== undefined) {
        updateData.credit_balance = values.creditBalance;
      }

      // Only update created_at if it's provided (for editing creation date)
      if (values.createdAt) {
        updateData.created_at = new Date(values.createdAt).toISOString();
      }

      // Update training_start_date if provided
      if (values.training_start_date !== undefined) {
        updateData.training_start_date = values.training_start_date;
      }

      // Extended fields - only if explicitly provided
      if (values.handedness !== undefined) updateData.handedness = values.handedness;
      if (values.occupation !== undefined) updateData.occupation = values.occupation;
      if (values.sitting_hours_daily !== undefined) updateData.sitting_hours_daily = values.sitting_hours_daily;
      if (values.sports_history !== undefined) updateData.sports_history = values.sports_history;
      if (values.current_activities !== undefined) updateData.current_activities = values.current_activities;
      if (values.sleep_hours !== undefined) updateData.sleep_hours = values.sleep_hours;
      if (values.stress_level !== undefined) updateData.stress_level = values.stress_level;
      if (values.dietary_restrictions !== undefined) updateData.dietary_restrictions = values.dietary_restrictions;
      if (values.supplements !== undefined) updateData.supplements = values.supplements;
      
      // Pre-diagnostic fields - only if explicitly provided
      if (values.height !== undefined) updateData.height = values.height;
      if (values.weight !== undefined) updateData.weight = values.weight;
      if (values.sleep_quality !== undefined) updateData.sleep_quality = values.sleep_quality;
      if (values.pain_areas !== undefined) updateData.pain_areas = values.pain_areas;
      if (values.injury_history !== undefined) updateData.injury_history = values.injury_history;
      if (values.surgery_history !== undefined) updateData.surgery_history = values.surgery_history;
      if (values.movement_frequency !== undefined) updateData.movement_frequency = values.movement_frequency;
      if (values.daily_activity_type !== undefined) updateData.daily_activity_type = values.daily_activity_type;
      if (values.training_dislikes !== undefined) updateData.training_dislikes = values.training_dislikes;

      // Custom pricing fields
      if (hasCustomPriceUpdate) updateData.custom_training_price = rest.custom_training_price;
      if ('custom_price_note' in rest) updateData.custom_price_note = rest.custom_price_note;
      if ('custom_price_credit_limit' in rest) updateData.custom_price_credit_limit = rest.custom_price_credit_limit;

      // Don't update if no fields to update
      if (Object.keys(updateData).length === 0) {
        throw new Error("No fields to update");
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
    onError: () => {
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
    onError: () => {
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
    onError: () => {
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
    onError: () => {
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
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit platební režim.",
        variant: "destructive",
      });
    },
  });
}
