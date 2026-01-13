import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all peer challenges that should be completed
    const { data: expiredChallenges, error: fetchError } = await supabase
      .from("peer_challenges")
      .select("id, title, xp_bet_enabled")
      .eq("status", "active")
      .lt("end_at", new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${expiredChallenges?.length || 0} expired peer challenges to complete`);

    const results = [];

    for (const challenge of expiredChallenges || []) {
      // Update status to completed
      const { error: updateError } = await supabase
        .from("peer_challenges")
        .update({ status: "completed" })
        .eq("id", challenge.id);

      if (updateError) {
        console.error(`Failed to complete challenge ${challenge.id}:`, updateError);
        results.push({ id: challenge.id, success: false, error: updateError.message });
        continue;
      }

      // If XP betting is enabled, settle the bets
      if (challenge.xp_bet_enabled) {
        const { error: settleError } = await supabase.rpc("settle_peer_challenge_xp_bets", {
          p_challenge_id: challenge.id,
        });

        if (settleError) {
          console.error(`Failed to settle XP for challenge ${challenge.id}:`, settleError);
          results.push({ id: challenge.id, success: false, error: settleError.message });
          continue;
        }
      }

      // Get participants to send notifications
      const { data: participants } = await supabase
        .from("peer_challenge_participants")
        .select("client_id, xp_result, final_rank")
        .eq("challenge_id", challenge.id);

      // Create notifications for each participant
      for (const participant of participants || []) {
        let message = `Výzva "${challenge.title}" skončila.`;
        
        if (challenge.xp_bet_enabled && participant.xp_result !== null) {
          if (participant.xp_result > 0) {
            message += ` Získal jsi +${participant.xp_result} XP! 🎉`;
          } else if (participant.xp_result < 0) {
            message += ` Ztratil jsi ${Math.abs(participant.xp_result)} XP.`;
          }
        }
        
        if (participant.final_rank) {
          message += ` Tvé umístění: ${participant.final_rank}. místo.`;
        }

        await supabase.from("client_portal_notifications").insert({
          client_id: participant.client_id,
          type: "peer_challenge_ended",
          title: "Výzva ukončena",
          message,
          metadata: {
            challenge_id: challenge.id,
            xp_result: participant.xp_result,
            final_rank: participant.final_rank,
          },
        });
      }

      results.push({ id: challenge.id, success: true });
      console.log(`Successfully completed challenge ${challenge.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error completing peer challenges:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
