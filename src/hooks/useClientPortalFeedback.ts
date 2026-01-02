import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortalAuth } from "./useClientPortalAuth";
import { addHours, isAfter, isBefore } from "date-fns";

export interface PendingFeedback {
  training_session_id: string;
  training_date: string;
  training_notes: string | null;
  feedback_available_from: Date;
  feedback_expires_at: Date;
  is_available: boolean;
  is_expired: boolean;
}

// Feedback is available 24h after training and expires 72h after training
const FEEDBACK_DELAY_HOURS = 24;
const FEEDBACK_EXPIRY_HOURS = 72;

export function useClientPortalPendingFeedbacks() {
  const { clientAccount } = useClientPortalAuth();

  return useQuery({
    queryKey: ["client-portal-pending-feedbacks", clientAccount?.client_id],
    queryFn: async () => {
      if (!clientAccount?.client_id) return [];

      const now = new Date();
      // Get trainings from the last 72 hours that don't have feedback yet
      const cutoffDate = addHours(now, -FEEDBACK_EXPIRY_HOURS);

      // Get completed training sessions for this client
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("id, date, notes, client_id")
        .eq("client_id", clientAccount.client_id)
        .eq("status", "completed")
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) return [];

      // Get existing feedbacks for these sessions
      const sessionIds = sessions.map((s) => s.id);
      const { data: existingFeedbacks, error: feedbackError } = await supabase
        .from("training_feedback")
        .select("training_session_id")
        .in("training_session_id", sessionIds);

      if (feedbackError) throw feedbackError;

      const feedbackSessionIds = new Set(
        existingFeedbacks?.map((f) => f.training_session_id) || []
      );

      // Filter sessions without feedback and calculate availability
      const pendingFeedbacks: PendingFeedback[] = sessions
        .filter((session) => !feedbackSessionIds.has(session.id))
        .map((session) => {
          const trainingDate = new Date(session.date);
          const availableFrom = addHours(trainingDate, FEEDBACK_DELAY_HOURS);
          const expiresAt = addHours(trainingDate, FEEDBACK_EXPIRY_HOURS);

          return {
            training_session_id: session.id,
            training_date: session.date,
            training_notes: session.notes,
            feedback_available_from: availableFrom,
            feedback_expires_at: expiresAt,
            is_available: isAfter(now, availableFrom) && isBefore(now, expiresAt),
            is_expired: isAfter(now, expiresAt),
          };
        })
        .filter((f) => !f.is_expired); // Only show non-expired

      return pendingFeedbacks;
    },
    enabled: !!clientAccount?.client_id,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useAvailableFeedbacks() {
  const { data: pendingFeedbacks } = useClientPortalPendingFeedbacks();
  return pendingFeedbacks?.filter((f) => f.is_available) ?? [];
}

export function useSubmitClientPortalFeedback() {
  const queryClient = useQueryClient();
  const { clientAccount } = useClientPortalAuth();

  return useMutation({
    mutationFn: async ({
      trainingSessionId,
      values,
      painAreas,
      painAreaIntensities,
      painAreaOther,
      painType,
      sleepAfter,
      sleepHours,
      note,
    }: {
      trainingSessionId: string;
      values: Record<string, number>;
      painAreas?: string[];
      painAreaIntensities?: Record<string, { intensity: number; isNew: boolean }>;
      painAreaOther?: string;
      painType?: "muscle" | "joint" | "tendon" | null;
      sleepAfter?: "poor" | "average" | "good" | null;
      sleepHours?: number;
      note?: string;
    }) => {
      if (!clientAccount?.client_id || !clientAccount?.trainer_id) {
        throw new Error("Client not authenticated");
      }

      // Get training session details
      const { data: session, error: sessionError } = await supabase
        .from("training_sessions")
        .select("date")
        .eq("id", trainingSessionId)
        .single();

      if (sessionError) throw sessionError;

      // Insert feedback - use trainer_id as user_id (owner of the data)
      // RLS policy allows clients to insert for their own client_id via auth_user_id
      // Map slider values (1-10) to database ranges (1-5)
      const mapToFiveScale = (val: number | undefined, defaultVal: number = 3): number => {
        if (!val) return defaultVal;
        return Math.max(1, Math.min(5, Math.ceil(val / 2)));
      };

      // Map pain_type - database only allows 'muscle' or 'joint'
      const mappedPainType = painType === 'tendon' ? 'muscle' : painType || null;

      const { error } = await supabase.from("training_feedback").insert({
        training_session_id: trainingSessionId,
        client_id: clientAccount.client_id,
        user_id: clientAccount.trainer_id,
        training_date: session.date,
        source: "link", // Database allows: 'manual', 'email', 'link'
        // Required fields with defaults based on slider values (mapped to 1-5 scale)
        fatigue_level: mapToFiveScale(values.energy ? 10 - values.energy : undefined, 3),
        energy_level: values.energy && values.energy >= 7 ? "stable" : values.energy && values.energy <= 3 ? "low_entire" : "stable",
        rpe_rating: values.difficulty || 5,
        mood_rating: mapToFiveScale(values.fun, 3), // Database allows 1-5
        technique_rating: 5, // Default
        goal_relevance: "yes", // Database allows: 'yes', 'partially', 'no'
        // Slider values
        soreness: values.soreness || null,
        body_feel: values.body_feel || null,
        energy_rating: values.energy || null,
        pain: values.pain || null,
        session_fit: values.session_fit || null,
        difficulty: values.difficulty || null,
        fun: values.fun || null,
        // Pain data
        pain_area: painAreas?.length ? painAreas.join(", ") : null,
        pain_area_intensities: painAreaIntensities || null,
        pain_area_other: painAreaOther || null,
        pain_type: mappedPainType, // Database allows: 'muscle', 'joint'
        // Sleep data
        sleep_after: sleepAfter || null,
        sleep_hours: sleepHours || null,
        // Note (max 200 chars in database)
        comment: note ? note.substring(0, 200) : null,
      });

      if (error) throw error;
      await supabase.from("notifications").insert({
        client_id: clientAccount.client_id,
        user_id: clientAccount.trainer_id,
        type: "feedback_received",
        title: "Klient vyplnil zpětnou vazbu",
        message: `Zpětná vazba k tréninku ze dne ${session.date} byla vyplněna přes klientský portál.`,
      });

      // Mark notification as completed if exists
      await supabase
        .from("client_portal_notifications")
        .update({ action_completed: true, is_read: true })
        .eq("client_id", clientAccount.client_id)
        .eq("type", "feedback_reminder")
        .contains("metadata", { training_session_id: trainingSessionId });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["client-portal-pending-feedbacks"],
      });
      queryClient.invalidateQueries({
        queryKey: ["client-portal-notifications"],
      });
    },
  });
}
