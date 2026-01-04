import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeDefinition {
  id: string;
  rule_type: string;
  rule_value: Record<string, any>;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
}

interface WorkoutData {
  performed_at: string;
  workout_type: string | null;
  confirmed_by: 'coach' | 'client';
  xp: number;
}

interface NutritionData {
  totalEntries: number;
  completeDays: number;
  streak: number;
  hydration2lDays: number;
  breakfastCount: number;
}

// Calculate week number (Monday-start) in Europe/Prague timezone
function getWeekKey(date: Date): string {
  // Adjust to Monday start
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return `${d.getFullYear()}-W${String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000)).padStart(2, '0')}`;
}

// Calculate current streak in weeks
function calculateWeekStreak(workouts: WorkoutData[]): number {
  if (!workouts.length) return 0;
  
  const weeks = new Set<string>();
  workouts.forEach(w => {
    weeks.add(getWeekKey(new Date(w.performed_at)));
  });
  
  let streak = 0;
  const now = new Date();
  
  for (let i = 0; i < 52; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - (i * 7));
    const weekKey = getWeekKey(checkDate);
    
    if (weeks.has(weekKey)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  
  return streak;
}

// Check if workout is in time window
function isInTimeWindow(workoutDate: Date, startAt: string | null, endAt: string | null): boolean {
  if (!startAt || !endAt) return true;
  const start = new Date(startAt);
  const end = new Date(endAt);
  return workoutDate >= start && workoutDate <= end;
}

// Calculate badge progress
function calculateBadgeProgress(
  badge: BadgeDefinition,
  workouts: WorkoutData[],
  allTimeWorkouts: WorkoutData[],
  nutritionData?: NutritionData
): { current: number; target: number; earned: boolean } {
  const ruleValue = badge.rule_value;
  let current = 0;
  let target = 1;
  
  switch (badge.rule_type) {
    case 'milestone_total':
      target = ruleValue.count || 1;
      current = allTimeWorkouts.length;
      break;
      
    case 'streak_weeks':
      target = ruleValue.weeks || 1;
      current = calculateWeekStreak(allTimeWorkouts);
      break;
      
    case 'type_count':
      target = ruleValue.count || 20;
      const workoutType = ruleValue.type;
      current = allTimeWorkouts.filter(w => w.workout_type === workoutType).length;
      break;
      
    // Nutrition badge types
    case 'nutrition_entries_count':
      target = ruleValue.count || 1;
      current = nutritionData?.totalEntries || 0;
      break;
      
    case 'nutrition_days_complete':
      target = ruleValue.count || 1;
      current = nutritionData?.completeDays || 0;
      break;
      
    case 'nutrition_streak_days':
      target = ruleValue.days || 3;
      current = nutritionData?.streak || 0;
      break;
      
    case 'nutrition_special':
      const specialNutritionType = ruleValue.special_type;
      target = ruleValue.count || 1;
      
      switch (specialNutritionType) {
        case 'hydration_2l':
          current = nutritionData?.hydration2lDays || 0;
          break;
        case 'breakfast_count':
          current = nutritionData?.breakfastCount || 0;
          break;
      }
      break;
      
    case 'special':
      const specialType = ruleValue.special_type;
      target = ruleValue.count || 1;
      
      switch (specialType) {
        case 'early_bird':
          const beforeHour = ruleValue.before_hour || 9;
          current = allTimeWorkouts.filter(w => {
            const hour = new Date(w.performed_at).getHours();
            return hour < beforeHour;
          }).length;
          break;
          
        case 'sunday':
          current = allTimeWorkouts.filter(w => {
            const day = new Date(w.performed_at).getDay();
            return day === 0;
          }).length;
          break;
          
        case 'weekend':
          // Count weekend workouts (Saturday = 6, Sunday = 0)
          current = allTimeWorkouts.filter(w => {
            const day = new Date(w.performed_at).getDay();
            return day === 0 || day === 6;
          }).length;
          break;
          
        case 'first_of_week':
          // Count unique weeks with at least one workout
          const weekFirsts = new Set<string>();
          allTimeWorkouts.forEach(w => {
            weekFirsts.add(getWeekKey(new Date(w.performed_at)));
          });
          current = weekFirsts.size;
          break;
          
        case 'variety_week':
          // Find if any week has 3+ different workout types
          const weekTypes: Record<string, Set<string>> = {};
          allTimeWorkouts.forEach(w => {
            const weekKey = getWeekKey(new Date(w.performed_at));
            if (!weekTypes[weekKey]) weekTypes[weekKey] = new Set();
            if (w.workout_type) weekTypes[weekKey].add(w.workout_type);
          });
          current = Object.values(weekTypes).some(types => types.size >= 3) ? 1 : 0;
          break;
          
        case 'double_day':
          // Count days with 2+ workouts
          const dayCounts: Record<string, number> = {};
          allTimeWorkouts.forEach(w => {
            const dateKey = new Date(w.performed_at).toISOString().split('T')[0];
            dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1;
          });
          current = Object.values(dayCounts).filter(c => c >= 2).length;
          break;
          
        case 'comeback':
          target = 1;
          // Check for 14+ day gap followed by workout
          const sortedWorkouts = [...allTimeWorkouts].sort(
            (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime()
          );
          for (let i = 1; i < sortedWorkouts.length; i++) {
            const prev = new Date(sortedWorkouts[i - 1].performed_at);
            const curr = new Date(sortedWorkouts[i].performed_at);
            const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays >= (ruleValue.pause_days || 14)) {
              current = 1;
              break;
            }
          }
          break;
          
        case 'weekly_count':
          // Find best week
          const weekCounts: Record<string, number> = {};
          allTimeWorkouts.forEach(w => {
            const weekKey = getWeekKey(new Date(w.performed_at));
            weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
          });
          current = Math.max(0, ...Object.values(weekCounts));
          break;
      }
      break;
      
    case 'xp_milestone':
      // Will be handled separately with XP data
      target = ruleValue.xp || 1000;
      current = 0; // Will be set in the main loop
      break;
      
    case 'seasonal':
    case 'holiday':
      if (!badge.start_at || !badge.end_at) break;
      
      target = ruleValue.count || 1;
      const windowWorkouts = allTimeWorkouts.filter(w => 
        isInTimeWindow(new Date(w.performed_at), badge.start_at, badge.end_at)
      );
      current = windowWorkouts.length;
      break;
  }
  
  return {
    current: Math.min(current, target),
    target,
    earned: current >= target,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { client_id, recalculate_all } = await req.json();
    
    if (!client_id && !recalculate_all) {
      return new Response(
        JSON.stringify({ error: 'client_id or recalculate_all required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get client IDs to process
    let clientIds: string[] = [];
    
    if (recalculate_all) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('is_archived', false);
      clientIds = clients?.map(c => c.id) || [];
    } else {
      clientIds = [client_id];
    }
    
    console.log(`Processing ${clientIds.length} clients`);
    
    // Get all active badge definitions
    const { data: badges, error: badgesError } = await supabase
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true);
    
    if (badgesError) throw badgesError;
    
    const results: Record<string, any> = {};
    
    for (const clientId of clientIds) {
      // Get all workouts for this client
      const { data: confirmedWorkouts } = await supabase
        .from('client_confirmed_workouts')
        .select('performed_at, workout_type, confirmed_by, xp')
        .eq('client_id', clientId);
      
      // Get client's total XP for xp_milestone badges
      const { data: clientXP } = await supabase
        .from('client_xp')
        .select('total_xp')
        .eq('client_id', clientId)
        .single();
      
      const totalXP = clientXP?.total_xp || 0;
      
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('date, training_type')
        .eq('client_id', clientId)
        .eq('status', 'completed');
      
      // Fetch nutrition data for nutrition badges
      const nutritionData = await fetchNutritionData(supabase, clientId);
      
      // Combine workouts
      const allWorkouts: WorkoutData[] = [
        ...(confirmedWorkouts || []).map(w => ({
          performed_at: w.performed_at,
          workout_type: w.workout_type,
          confirmed_by: w.confirmed_by as 'coach' | 'client',
          xp: w.xp,
        })),
        ...(trainingSessions || []).map(t => ({
          performed_at: t.date,
          workout_type: t.training_type,
          confirmed_by: 'coach' as const,
          xp: 10,
        })),
      ].sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime());
      
      console.log(`Client ${clientId}: ${allWorkouts.length} workouts, ${nutritionData.totalEntries} nutrition entries`);
      
      // Get existing badges to detect newly earned ones
      const { data: existingBadges } = await supabase
        .from('client_badges')
        .select('badge_id, earned_at')
        .eq('client_id', clientId);
      
      const existingBadgeMap = new Map(
        (existingBadges || []).map(b => [b.badge_id, b.earned_at])
      );
      
      // Calculate progress for each badge
      const badgeUpdates: any[] = [];
      const newlyEarnedBadges: { badge_id: string; badge_name: string; badge_rarity: string }[] = [];
      
      for (const badge of badges || []) {
        let progress = calculateBadgeProgress(badge, allWorkouts, allWorkouts, nutritionData);
        
        // Handle xp_milestone badges separately
        if (badge.rule_type === 'xp_milestone') {
          const targetXP = badge.rule_value.xp || 1000;
          progress = {
            current: Math.min(totalXP, targetXP),
            target: targetXP,
            earned: totalXP >= targetXP,
          };
        }
        
        const wasEarned = existingBadgeMap.get(badge.id);
        const isNewlyEarned = progress.earned && !wasEarned;
        
        badgeUpdates.push({
          client_id: clientId,
          badge_id: badge.id,
          progress_current: progress.current,
          progress_target: progress.target,
          earned_at: progress.earned ? (wasEarned || new Date().toISOString()) : null,
        });
        
        if (isNewlyEarned) {
          newlyEarnedBadges.push({
            badge_id: badge.id,
            badge_name: (badge as any).name || badge.id,
            badge_rarity: (badge as any).rarity || 'Common',
          });
        }
      }
      
      // Upsert badge progress
      if (badgeUpdates.length > 0) {
        const { error: upsertError } = await supabase
          .from('client_badges')
          .upsert(badgeUpdates, {
            onConflict: 'client_id,badge_id',
            ignoreDuplicates: false,
          });
        
        if (upsertError) {
          console.error(`Error upserting badges for ${clientId}:`, upsertError);
        }
      }
      
      // Track newly earned badges in client_portal_activity
      for (const earnedBadge of newlyEarnedBadges) {
        try {
          await supabase
            .from('client_portal_activity')
            .insert({
              client_id: clientId,
              activity_type: 'badge_earned',
              activity_date: new Date().toISOString().split('T')[0],
              metadata: {
                badge_id: earnedBadge.badge_id,
                badge_name: earnedBadge.badge_name,
                badge_rarity: earnedBadge.badge_rarity,
              },
            });
          console.log(`Tracked badge earned: ${earnedBadge.badge_name} for client ${clientId}`);
        } catch (activityError) {
          console.error(`Failed to track badge activity:`, activityError);
        }
      }
      
      // Create confirmed workout entries for training_sessions that don't have one
      for (const session of trainingSessions || []) {
        const sessionDateStr = session.date.split('T')[0];
        const exists = confirmedWorkouts?.some(
          w => w.performed_at.startsWith(sessionDateStr) && w.confirmed_by === 'coach'
        );
        
        if (!exists) {
          // Sync training session to confirmed workouts - use upsert to handle duplicates
          const { error: insertError } = await supabase
            .from('client_confirmed_workouts')
            .upsert({
              client_id: clientId,
              performed_at: session.date,
              performed_date: sessionDateStr,
              workout_type: session.training_type,
              confirmed_by: 'coach',
              xp: 10,
            }, {
              onConflict: 'client_id,performed_date',
              ignoreDuplicates: true,
            });
          
          if (insertError) {
            console.log(`Skipping duplicate workout for ${clientId} on ${sessionDateStr}`);
          }
        }
      }
      
      results[clientId] = {
        workouts: allWorkouts.length,
        badges_updated: badgeUpdates.length,
        earned: badgeUpdates.filter(b => b.earned_at).length,
      };
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        clients_processed: clientIds.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in recalculate-badges:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to fetch nutrition data for badges
async function fetchNutritionData(supabase: any, clientId: string): Promise<NutritionData> {
  try {
    // Get all nutrition entries counts
    const [foodResult, drinkResult, coffeeResult] = await Promise.all([
      supabase.from('nutrition_food_entries').select('id, entry_date, meal_type', { count: 'exact' }).eq('client_id', clientId),
      supabase.from('nutrition_drink_entries').select('id, entry_date, drink_type, amount_ml', { count: 'exact' }).eq('client_id', clientId),
      supabase.from('nutrition_coffee_entries').select('id, entry_date', { count: 'exact' }).eq('client_id', clientId),
    ]);

    const totalEntries = (foodResult.count || 0) + (drinkResult.count || 0) + (coffeeResult.count || 0);

    // Calculate complete days (3+ food entries + 500ml water)
    const foodEntries = foodResult.data || [];
    const drinkEntries = drinkResult.data || [];

    // Group by date
    const dateStats: Record<string, { foodCount: number; waterMl: number }> = {};
    
    foodEntries.forEach((e: any) => {
      if (!dateStats[e.entry_date]) dateStats[e.entry_date] = { foodCount: 0, waterMl: 0 };
      dateStats[e.entry_date].foodCount++;
    });

    drinkEntries.forEach((e: any) => {
      if (!dateStats[e.entry_date]) dateStats[e.entry_date] = { foodCount: 0, waterMl: 0 };
      if (e.drink_type === 'water') {
        dateStats[e.entry_date].waterMl += e.amount_ml || 0;
      }
    });

    // Count complete days (3+ food, 500+ ml water)
    const completeDays = Object.values(dateStats).filter(d => d.foodCount >= 3 && d.waterMl >= 500).length;

    // Count days with 2L+ water
    const hydration2lDays = Object.values(dateStats).filter(d => d.waterMl >= 2000).length;

    // Count breakfast entries
    const breakfastCount = foodEntries.filter((e: any) => e.meal_type === 'breakfast').length;

    // Calculate streak
    const allDates = new Set<string>();
    [...foodEntries, ...drinkEntries, ...(coffeeResult.data || [])].forEach((e: any) => {
      allDates.add(e.entry_date);
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (allDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      totalEntries,
      completeDays,
      streak,
      hydration2lDays,
      breakfastCount,
    };
  } catch (error) {
    console.error('Error fetching nutrition data:', error);
    return {
      totalEntries: 0,
      completeDays: 0,
      streak: 0,
      hydration2lDays: 0,
      breakfastCount: 0,
    };
  }
}
