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
      if (!clientAccount?.client_id || !clientAccount?.trainer_id || !clientAccount?.auth_user_id) {
        throw new Error("Client not authenticated");
      }

      // Call unified edge function
      const { data, error } = await supabase.functions.invoke("feedback-submit", {
        body: {
          client_session_token: clientAccount.auth_user_id,
          training_session_id: trainingSessionId,
          values,
          pain_areas: painAreas,
          pain_area_intensities: painAreaIntensities,
          pain_area_other: painAreaOther,
          pain_type: painType,
          sleep_after: sleepAfter,
          sleep_hours: sleepHours,
          note,
        },
      });

      if (error) {
        // Try to extract specific error from response
        const errorData = error.context?.body ? JSON.parse(error.context.body) : null;
        throw new Error(errorData?.error || error.message || "Chyba při odesílání zpětné vazby");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return { success: true, feedbackId: data?.feedbackId };
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
