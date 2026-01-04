import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// XP values for nutrition activities
const XP_VALUES = {
  ENTRY: 2,              // Per food/drink/coffee entry
  DAY_COMPLETE: 10,      // For a complete day (3+ meals + water)
  STREAK_3: 5,           // 3-day streak bonus
  STREAK_7: 10,          // 7-day streak bonus
  STREAK_14: 15,         // 14-day streak bonus
  WEEK_COMPLETE: 25,     // 5+ days in a week with entries
};

// Daily XP cap for nutrition
const NUTRITION_DAILY_CAP = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, date, entry_type } = await req.json();

    if (!client_id || !date) {
      return new Response(
        JSON.stringify({ error: 'client_id and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating nutrition XP for client ${client_id} on ${date}, entry_type: ${entry_type}`);

    // Check if we already claimed entry XP for today
    const { data: existingEntryClaim } = await supabase
      .from('nutrition_xp_claims')
      .select('id, xp_amount')
      .eq('client_id', client_id)
      .eq('claim_date', date)
      .eq('claim_type', 'entry')
      .maybeSingle();

    let totalXPAwarded = 0;
    const xpEvents: { source_type: string; xp_amount: number; description: string }[] = [];

    // Count today's entries
    const [foodCount, drinkCount, coffeeCount] = await Promise.all([
      supabase.from('nutrition_food_entries').select('id', { count: 'exact', head: true })
        .eq('client_id', client_id).eq('entry_date', date),
      supabase.from('nutrition_drink_entries').select('id', { count: 'exact', head: true })
        .eq('client_id', client_id).eq('entry_date', date),
      supabase.from('nutrition_coffee_entries').select('id', { count: 'exact', head: true })
        .eq('client_id', client_id).eq('entry_date', date),
    ]);

    const todayEntriesCount = (foodCount.count || 0) + (drinkCount.count || 0) + (coffeeCount.count || 0);

    // Calculate water intake for today
    const { data: waterData } = await supabase
      .from('nutrition_drink_entries')
      .select('amount_ml')
      .eq('client_id', client_id)
      .eq('entry_date', date)
      .eq('drink_type', 'water');

    const waterMl = waterData?.reduce((sum, d) => sum + (d.amount_ml || 0), 0) || 0;

    // Calculate how much entry XP we can still award today
    const entryXpAlreadyClaimed = existingEntryClaim?.xp_amount || 0;
    const maxEntryXpPerDay = 20; // Max 10 entries × 2 XP
    
    if (entryXpAlreadyClaimed < maxEntryXpPerDay) {
      // Award XP for the new entry
      const entryXp = Math.min(XP_VALUES.ENTRY, maxEntryXpPerDay - entryXpAlreadyClaimed);
      
      if (entryXp > 0) {
        // Update or insert entry claim
        const newEntryTotal = entryXpAlreadyClaimed + entryXp;
        
        if (existingEntryClaim) {
          await supabase
            .from('nutrition_xp_claims')
            .update({ xp_amount: newEntryTotal })
            .eq('id', existingEntryClaim.id);
        } else {
          await supabase
            .from('nutrition_xp_claims')
            .insert({
              client_id,
              claim_date: date,
              claim_type: 'entry',
              xp_amount: entryXp,
            });
        }

        xpEvents.push({
          source_type: 'nutrition_entry',
          xp_amount: entryXp,
          description: `Nutriční záznam (+${entryXp} XP)`,
        });
        totalXPAwarded += entryXp;
      }
    }

    // Check for complete day bonus (3+ meals + 500ml water)
    const { data: dayCompleteClaim } = await supabase
      .from('nutrition_xp_claims')
      .select('id')
      .eq('client_id', client_id)
      .eq('claim_date', date)
      .eq('claim_type', 'day_complete')
      .maybeSingle();

    if (!dayCompleteClaim && (foodCount.count || 0) >= 3 && waterMl >= 500) {
      await supabase
        .from('nutrition_xp_claims')
        .insert({
          client_id,
          claim_date: date,
          claim_type: 'day_complete',
          xp_amount: XP_VALUES.DAY_COMPLETE,
        });

      xpEvents.push({
        source_type: 'nutrition_day_complete',
        xp_amount: XP_VALUES.DAY_COMPLETE,
        description: `Kompletní nutriční den (+${XP_VALUES.DAY_COMPLETE} XP)`,
      });
      totalXPAwarded += XP_VALUES.DAY_COMPLETE;
    }

    // Calculate nutrition streak
    const streak = await calculateNutritionStreak(supabase, client_id);
    console.log(`Nutrition streak for client ${client_id}: ${streak} days`);

    // Check for streak bonuses
    for (const [streakDays, claimType, xpValue] of [
      [3, 'streak_3', XP_VALUES.STREAK_3],
      [7, 'streak_7', XP_VALUES.STREAK_7],
      [14, 'streak_14', XP_VALUES.STREAK_14],
    ] as const) {
      if (streak >= streakDays) {
        const { data: streakClaim } = await supabase
          .from('nutrition_xp_claims')
          .select('id')
          .eq('client_id', client_id)
          .eq('claim_type', claimType)
          .gte('claim_date', new Date(Date.now() - streakDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .maybeSingle();

        if (!streakClaim) {
          await supabase
            .from('nutrition_xp_claims')
            .insert({
              client_id,
              claim_date: date,
              claim_type: claimType,
              xp_amount: xpValue,
            });

          xpEvents.push({
            source_type: 'nutrition_streak_day',
            xp_amount: xpValue,
            description: `${streakDays}-denní nutriční streak (+${xpValue} XP)`,
          });
          totalXPAwarded += xpValue;
        }
      }
    }

    // Insert XP events
    if (xpEvents.length > 0) {
      for (const event of xpEvents) {
        await supabase.from('xp_events').insert({
          client_id,
          xp_amount: event.xp_amount,
          source_type: event.source_type,
          description: event.description,
        });
      }

      // Update client_xp total
      const { data: currentXP } = await supabase
        .from('client_xp')
        .select('total_xp, level, level_xp')
        .eq('client_id', client_id)
        .maybeSingle();

      if (currentXP) {
        const newTotalXP = (currentXP.total_xp || 0) + totalXPAwarded;
        const newLevelXP = (currentXP.level_xp || 0) + totalXPAwarded;

        // Simple level calculation (100 XP per level)
        const xpPerLevel = 100;
        let level = currentXP.level || 1;
        let levelXP = newLevelXP;

        while (levelXP >= xpPerLevel) {
          levelXP -= xpPerLevel;
          level++;
        }

        const xpToNext = xpPerLevel - levelXP;
        const leveledUp = level > (currentXP.level || 1);

        await supabase
          .from('client_xp')
          .update({
            total_xp: newTotalXP,
            level,
            level_xp: levelXP,
            xp_to_next: xpToNext,
            last_xp_date: date,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', client_id);

        console.log(`Updated XP for client ${client_id}: +${totalXPAwarded} XP, total: ${newTotalXP}, level: ${level}`);

        // Recalculate badges after XP update
        try {
          await supabase.functions.invoke('recalculate-badges', {
            body: { client_id },
          });
        } catch (e) {
          console.error('Failed to recalculate badges:', e);
        }

        return new Response(
          JSON.stringify({
            success: true,
            xp_awarded: totalXPAwarded,
            events: xpEvents,
            new_total_xp: newTotalXP,
            level,
            leveled_up: leveledUp,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Create new client_xp record
        await supabase
          .from('client_xp')
          .insert({
            client_id,
            total_xp: totalXPAwarded,
            level: 1,
            level_xp: totalXPAwarded,
            xp_to_next: 100 - totalXPAwarded,
            last_xp_date: date,
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        xp_awarded: totalXPAwarded,
        events: xpEvents,
        streak,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating nutrition XP:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateNutritionStreak(supabase: any, clientId: string): Promise<number> {
  // Get all unique dates with nutrition entries in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [foodDates, drinkDates, coffeeDates] = await Promise.all([
    supabase.from('nutrition_food_entries')
      .select('entry_date')
      .eq('client_id', clientId)
      .gte('entry_date', thirtyDaysAgoStr),
    supabase.from('nutrition_drink_entries')
      .select('entry_date')
      .eq('client_id', clientId)
      .gte('entry_date', thirtyDaysAgoStr),
    supabase.from('nutrition_coffee_entries')
      .select('entry_date')
      .eq('client_id', clientId)
      .gte('entry_date', thirtyDaysAgoStr),
  ]);

  const allDates = new Set<string>();
  [...(foodDates.data || []), ...(drinkDates.data || []), ...(coffeeDates.data || [])]
    .forEach(e => allDates.add(e.entry_date));

  // Calculate streak from today backwards
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (allDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Allow missing today, but break on any other gap
      break;
    }
  }

  return streak;
}
