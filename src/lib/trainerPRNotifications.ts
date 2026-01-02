import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
// Trainer's client_id (Trenér Radek)
const TRAINER_CLIENT_ID = "29d2692d-ece4-43f5-a770-fe46bc592917";

// Motivational messages for weight-based PRs (higher is better)
const WEIGHT_PR_MESSAGES = [
  "Trenér právě zvedl {weight} kg na cviku {exercise}! Dokážeš ho překonat? 💪",
  "Pozor, trenér ti utekl! {exercise}: {weight} kg. Výzva přijata? 🔥",
  "Trenér nastavil laťku: {exercise} - {weight} kg. Jsi připraven/a? 🏋️",
  "Nový rekord trenéra! {exercise}: {weight} kg. Přijímáš výzvu? 💥",
  "Trenér právě posunul hranice: {weight} kg na {exercise}. Tah je na tobě! 🎯",
];

// Motivational messages for time-based PRs (lower is better)
const TIME_PR_MESSAGES = [
  "Trenér zaběhl {exercise} za {time}! Předběhneš ho? ⏱️",
  "Nový rekord trenéra: {exercise} - {time}. Dokážeš být rychlejší? 🚀",
  "Trenér tě právě vyzval! {exercise}: {time}. Přijímáš? 🔥",
  "Trenér zlomil svůj rekord: {time} na {exercise}. Dokážeš to taky? ⚡",
  "Pozor, trenér zrychlil! {exercise} za {time}. Doženeš ho? 🏃",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")} min`;
  }
  return `${secs} s`;
}

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

interface NotifyClientsParams {
  exerciseName: string;
  weightKg: number | null;
  timeSeconds: number | null;
  userId: string;
}

export async function notifyClientsAboutTrainerPR({
  exerciseName,
  weightKg,
  timeSeconds,
  userId,
}: NotifyClientsParams): Promise<void> {
  try {
    // Check if trainer has leaderboard visibility enabled
    const { data: trainerSettings } = await supabase
      .from("client_leaderboard_settings")
      .select("leaderboard_visible")
      .eq("client_id", TRAINER_CLIENT_ID)
      .single();

    if (!trainerSettings?.leaderboard_visible) {
      console.log("Trainer leaderboard not visible, skipping notifications");
      return;
    }

    // Find all other clients who have entries for this exercise
    const { data: clientEntries } = await supabase
      .from("exercise_entries")
      .select("client_id, weight_kg, time_seconds")
      .eq("exercise_name", exerciseName)
      .neq("client_id", TRAINER_CLIENT_ID);

    if (!clientEntries || clientEntries.length === 0) {
      return;
    }

    // Group by client and find their best performance
    const clientBestPerformance = new Map<
      string,
      { weight_kg: number | null; time_seconds: number | null }
    >();

    for (const entry of clientEntries) {
      const existing = clientBestPerformance.get(entry.client_id);

      if (!existing) {
        clientBestPerformance.set(entry.client_id, {
          weight_kg: entry.weight_kg,
          time_seconds: entry.time_seconds,
        });
      } else {
        // For weight, higher is better
        if (
          entry.weight_kg &&
          (!existing.weight_kg || entry.weight_kg > existing.weight_kg)
        ) {
          existing.weight_kg = entry.weight_kg;
        }
        // For time, lower is better
        if (
          entry.time_seconds &&
          (!existing.time_seconds || entry.time_seconds < existing.time_seconds)
        ) {
          existing.time_seconds = entry.time_seconds;
        }
      }
    }

    // Find clients with active portal accounts
    const clientIds = Array.from(clientBestPerformance.keys());
    const { data: activeAccounts } = await supabase
      .from("client_accounts")
      .select("client_id")
      .in("client_id", clientIds)
      .eq("is_active", true);

    if (!activeAccounts || activeAccounts.length === 0) {
      return;
    }

    const activeClientIds = new Set(activeAccounts.map((a) => a.client_id));
    const notifications: Array<{
      client_id: string;
      type: string;
      title: string;
      message: string;
      metadata: Json;
    }> = [];

    for (const [clientId, best] of clientBestPerformance) {
      // Skip if client doesn't have active portal
      if (!activeClientIds.has(clientId)) {
        continue;
      }

      let shouldNotify = false;
      let message = "";

      // Check weight-based comparison
      if (weightKg && weightKg > 0 && best.weight_kg) {
        if (weightKg > best.weight_kg) {
          shouldNotify = true;
          const template = getRandomMessage(WEIGHT_PR_MESSAGES);
          message = template
            .replace("{weight}", weightKg.toString())
            .replace("{exercise}", exerciseName);
        }
      }

      // Check time-based comparison
      if (timeSeconds && timeSeconds > 0 && best.time_seconds) {
        if (timeSeconds < best.time_seconds) {
          shouldNotify = true;
          const template = getRandomMessage(TIME_PR_MESSAGES);
          message = template
            .replace("{time}", formatTime(timeSeconds))
            .replace("{exercise}", exerciseName);
        }
      }

      if (shouldNotify && message) {
        notifications.push({
          client_id: clientId,
          type: "trainer_pr_challenge",
          title: "Trenér tě porazil! 🏆",
          message,
          metadata: {
            exercise_name: exerciseName,
            trainer_weight_kg: weightKg,
            trainer_time_seconds: timeSeconds,
            client_best_weight_kg: best.weight_kg,
            client_best_time_seconds: best.time_seconds,
          },
        });
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error } = await supabase
        .from("client_portal_notifications")
        .insert(notifications);

      if (error) {
        console.error("Error creating trainer PR notifications:", error);
      } else {
        console.log(`Created ${notifications.length} trainer PR challenge notifications`);
      }
    }
  } catch (error) {
    console.error("Error in notifyClientsAboutTrainerPR:", error);
  }
}

export function isTrainerClient(clientId: string): boolean {
  return clientId === TRAINER_CLIENT_ID;
}

export { TRAINER_CLIENT_ID };
