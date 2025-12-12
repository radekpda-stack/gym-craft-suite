import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DiagnosticAssessment {
  id: string;
  diagnostic_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  
  // Personal Info
  handedness?: string;
  occupation?: string;
  sitting_hours_daily?: number;
  
  // Lifestyle
  sports_history?: string;
  current_activities?: string[];
  sleep_hours?: number;
  sleep_quality?: number;
  stress_level?: number;
  regeneration_methods?: string[];
  meditates?: boolean;
  
  // Health
  diseases?: string[];
  surgeries?: string[];
  injuries?: string[];
  pain_areas?: string[];
  allergies?: string[];
  family_health_history?: string;
  
  // Goals
  short_term_goals?: string;
  long_term_goals?: string;
  training_priorities?: string[];
  
  // Mobility
  mobility_ankles?: string;
  mobility_hips?: string;
  mobility_thoracic?: string;
  mobility_shoulders?: string;
  core_stability?: string;
  
  // Movement Quality
  squat_quality?: string;
  lunge_quality?: string;
  push_quality?: string;
  pull_quality?: string;
  hip_hinge_quality?: string;
  
  // Pain Screening
  pain_ankle?: string;
  pain_knee?: string;
  pain_hip?: string;
  pain_si?: string;
  pain_lumbar?: string;
  pain_thoracic?: string;
  pain_shoulder?: string;
  pain_neck?: string;
  
  // Psychological
  motivation_level?: number;
  discipline_level?: number;
  preferred_training_style?: string;
  stress_management?: string;
  
  // Nutrition
  eating_regularity?: string;
  food_allergies?: string[];
  supplements?: string[];
  dietary_restrictions?: string[];
  
  // AI Analysis
  ai_analysis?: string;
  ai_risk_factors?: string[];
  ai_strengths?: string[];
  ai_priorities?: string[];
  ai_recommendations?: string;
  ai_contraindications?: string[];
  ai_must_do_exercises?: string[];
  ai_avoid_exercises?: string[];
  
  is_draft?: boolean;
}

export interface CreateAssessmentInput {
  diagnostic_id: string;
  [key: string]: any;
}

export function useDiagnosticAssessment(diagnosticId?: string) {
  return useQuery({
    queryKey: ["diagnostic-assessment", diagnosticId],
    queryFn: async () => {
      if (!diagnosticId) return null;
      
      const { data, error } = await supabase
        .from("diagnostic_assessments")
        .select("*")
        .eq("diagnostic_id", diagnosticId)
        .maybeSingle();

      if (error) throw error;
      return data as DiagnosticAssessment | null;
    },
    enabled: !!diagnosticId,
  });
}

export function useCreateDiagnosticAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAssessmentInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("diagnostic_assessments")
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnostic-assessment", data.diagnostic_id] });
      toast({
        title: "Diagnostika uložena",
        description: "Rozšířená diagnostika byla uložena.",
      });
    },
    onError: (error) => {
      console.error("Error creating assessment:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit diagnostiku.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateDiagnosticAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<DiagnosticAssessment>) => {
      const { data, error } = await supabase
        .from("diagnostic_assessments")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["diagnostic-assessment", data.diagnostic_id] });
      toast({
        title: "Diagnostika aktualizována",
      });
    },
    onError: (error) => {
      console.error("Error updating assessment:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat diagnostiku.",
        variant: "destructive",
      });
    },
  });
}
