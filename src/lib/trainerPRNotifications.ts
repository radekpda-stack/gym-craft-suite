import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { formatTimeWithUnit } from "@/lib/timeUtils";

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

// Messages when client beats trainer
const CLIENT_BEAT_TRAINER_WEIGHT_MESSAGES = [
  "Porazil/a jsi trenéra! 🎉 Tvých {weight} kg na {exercise} je víc než jeho {trainer_weight} kg!",
  "Gratuluji! Překonal/a jsi trenéra na {exercise}: {weight} kg vs {trainer_weight} kg! 💪",
  "Neuvěřitelné! Tvůj výkon {weight} kg na {exercise} je lepší než trenérův! 🏆",
];

const CLIENT_BEAT_TRAINER_TIME_MESSAGES = [
  "Porazil/a jsi trenéra! 🎉 Tvůj čas {time} na {exercise} je rychlejší než jeho {trainer_time}!",
  "Gratuluji! Překonal/a jsi trenéra na {exercise}: {time} vs {trainer_time}! 🚀",
  "Neuvěřitelné! Předběhl/a jsi trenéra na {exercise}! 🏆",
];

// Alias for backwards compatibility in this file
const formatTime = formatTimeWithUnit;

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

interface CheckClientBeatTrainerParams {
  clientId: string;
  exerciseName: string;
  weightKg: number | null;
  timeSeconds: number | null;
}

/**
 * Check if client just beat the trainer's best performance and award achievement
 */
export async function checkClientBeatTrainer({
  clientId,
  exerciseName,
  weightKg,
  timeSeconds,
}: CheckClientBeatTrainerParams): Promise<void> {
  try {
    // Don't check for trainer themselves
    if (clientId === TRAINER_CLIENT_ID) {
      return;
    }

    // Check if trainer has leaderboard visibility enabled
    const { data: trainerSettings } = await supabase
      .from("client_leaderboard_settings")
      .select("leaderboard_visible")
      .eq("client_id", TRAINER_CLIENT_ID)
      .single();

    if (!trainerSettings?.leaderboard_visible) {
      return;
    }

    // Get trainer's best performance for this exercise
    const { data: trainerEntries } = await supabase
      .from("exercise_entries")
      .select("weight_kg, time_seconds")
      .eq("client_id", TRAINER_CLIENT_ID)
      .eq("exercise_name", exerciseName);

    if (!trainerEntries || trainerEntries.length === 0) {
      return;
    }

    // Find trainer's best
    let trainerBestWeight: number | null = null;
    let trainerBestTime: number | null = null;

    for (const entry of trainerEntries) {
      if (entry.weight_kg && (!trainerBestWeight || entry.weight_kg > trainerBestWeight)) {
        trainerBestWeight = entry.weight_kg;
      }
      if (entry.time_seconds && (!trainerBestTime || entry.time_seconds < trainerBestTime)) {
        trainerBestTime = entry.time_seconds;
      }
    }

    let beatTrainer = false;
    let message = "";
    let achievementType = "";

    // Check if client beat trainer on weight
    if (weightKg && weightKg > 0 && trainerBestWeight && weightKg > trainerBestWeight) {
      beatTrainer = true;
      achievementType = "beat_trainer_weight";
      const template = getRandomMessage(CLIENT_BEAT_TRAINER_WEIGHT_MESSAGES);
      message = template
        .replace("{weight}", weightKg.toString())
        .replace("{trainer_weight}", trainerBestWeight.toString())
        .replace("{exercise}", exerciseName);
    }

    // Check if client beat trainer on time
    if (timeSeconds && timeSeconds > 0 && trainerBestTime && timeSeconds < trainerBestTime) {
      beatTrainer = true;
      achievementType = "beat_trainer_time";
      const template = getRandomMessage(CLIENT_BEAT_TRAINER_TIME_MESSAGES);
      message = template
        .replace("{time}", formatTime(timeSeconds))
        .replace("{trainer_time}", formatTime(trainerBestTime))
        .replace("{exercise}", exerciseName);
    }

    if (beatTrainer && message) {
      // Check if client has active portal account
      const { data: account } = await supabase
        .from("client_accounts")
        .select("client_id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .single();

      if (!account) {
        return;
      }

      // Create notification
      await supabase.from("client_portal_notifications").insert({
        client_id: clientId,
        type: "beat_trainer",
        title: "Porazil/a jsi trenéra! 👑",
        message,
        metadata: {
          exercise_name: exerciseName,
          client_weight_kg: weightKg,
          client_time_seconds: timeSeconds,
          trainer_best_weight_kg: trainerBestWeight,
          trainer_best_time_seconds: trainerBestTime,
        } as Json,
      });

      // Create repeatable achievement
      await supabase.from("client_achievements").insert({
        client_id: clientId,
        achievement_type: achievementType,
        achievement_data: {
          exercise_name: exerciseName,
          client_value: weightKg || timeSeconds,
          trainer_value: trainerBestWeight || trainerBestTime,
          earned_at: new Date().toISOString(),
        } as Json,
      });

      console.log(`Client ${clientId} beat trainer on ${exerciseName}!`);
    }
  } catch (error) {
    console.error("Error in checkClientBeatTrainer:", error);
  }
}

export { TRAINER_CLIENT_ID };
