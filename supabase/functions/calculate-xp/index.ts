import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// XP Configuration
const XP_CONFIG = {
  BASE_WORKOUT: 30,
  TYPE_BONUS: {
    'HIIT': 15,
    'Silový': 12,
    'Kondiční': 12,
    'Cardio': 10,
    'Mobilita': 8,
    'Regenerace': 6,
  } as Record<string, number>,
  MORNING_BONUS: 8,  // start_time <= 09:00
  WEEKEND_BONUS: 8,  // Saturday/Sunday
  FIRST_WEEK_WORKOUT: 5, // First workout of the week
  WEEKLY_STREAK: {
    3: 20,
    5: 40,
    8: 70,
  } as Record<number, number>,
  PR_BONUS: 25,
  PR_CHALLENGE_EXTRA: 15,
  DAILY_CAP: 150,
  PR_DAILY_CAP: 2,
};

interface WorkoutData {
  training_session_id: string;
  client_id: string;
  workout_type?: string;
  performed_at: string;
  performed_date: string;
  xp: number;
}

interface XpEvent {
  client_id: string;
  source_type: string;
  source_id: string;
  xp_amount: number;
  description: string;
  meta: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { workout_id, client_id, mode = 'calculate' } = await req.json();
    console.log(`[calculate-xp] Processing workout ${workout_id} for client ${client_id}, mode: ${mode}`);

    // Get workout details
    const { data: workout, error: workoutError } = await supabase
      .from('client_confirmed_workouts')
      .select('*')
      .eq('id', workout_id)
      .single();

    if (workoutError || !workout) {
      console.error('Workout not found:', workoutError);
      return new Response(JSON.stringify({ error: 'Workout not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const workoutData = workout as WorkoutData;
    const workoutDate = new Date(workoutData.performed_at);
    const dateStr = workoutData.performed_date;
    const events: XpEvent[] = [];

    // Check idempotency - don't process if already has XP events
    const { data: existingEvents } = await supabase
      .from('xp_events')
      .select('id')
      .eq('source_id', workout_id)
      .eq('source_type', 'workout_confirmed');

    if (existingEvents && existingEvents.length > 0) {
      console.log(`[calculate-xp] Workout ${workout_id} already processed, skipping`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already processed',
        idempotent: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get today's XP for cap checking
    const todayStart = new Date(dateStr);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(dateStr);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayEvents } = await supabase
      .from('xp_events')
      .select('xp_amount, source_type')
      .eq('client_id', client_id)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const todayXp = (todayEvents || []).reduce((sum, e) => sum + e.xp_amount, 0);
    const todayPRs = (todayEvents || []).filter(e => e.source_type === 'pr').length;
    let remainingCap = XP_CONFIG.DAILY_CAP - todayXp;

    const addEvent = (type: string, sourceId: string, amount: number, desc: string, meta: Record<string, unknown> = {}) => {
      if (remainingCap <= 0) {
        console.log(`[calculate-xp] Daily cap reached, skipping ${type}`);
        return 0;
      }
      const finalAmount = Math.min(amount, remainingCap);
      events.push({
        client_id,
        source_type: type,
        source_id: sourceId,
        xp_amount: finalAmount,
        description: desc,
        meta: { ...meta, original_amount: amount, capped: finalAmount < amount },
      });
      remainingCap -= finalAmount;
      return finalAmount;
    };

    // 1. Base workout XP
    addEvent('workout_confirmed', workout_id, XP_CONFIG.BASE_WORKOUT, 'Dokončený trénink', {
      workout_type: workoutData.workout_type,
      date: dateStr,
    });

    // 2. Type bonus
    const workoutType = workoutData.workout_type || '';
    const typeBonus = XP_CONFIG.TYPE_BONUS[workoutType] || 0;
    if (typeBonus > 0) {
      addEvent('workout_type_bonus', workout_id, typeBonus, `Bonus za typ: ${workoutType}`, {
        workout_type: workoutType,
      });
    }

    // 3. Morning bonus (before 09:00)
    const hour = workoutDate.getHours();
    if (hour < 9) {
      addEvent('morning_bonus', workout_id, XP_CONFIG.MORNING_BONUS, 'Ranní trénink', {
        hour,
      });
    }

    // 4. Weekend bonus
    const dayOfWeek = workoutDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      addEvent('weekend_bonus', workout_id, XP_CONFIG.WEEKEND_BONUS, 'Víkendový trénink', {
        day: dayOfWeek === 0 ? 'Neděle' : 'Sobota',
      });
    }

    // 5. Weekly streak check
    const weekKey = getWeekKey(workoutDate);
    await checkWeeklyStreak(supabase, client_id, weekKey, addEvent);

    // 6. First workout of the week bonus
    const isFirstOfWeek = await checkFirstWorkoutOfWeek(supabase, client_id, weekKey, workout_id);
    if (isFirstOfWeek) {
      addEvent('first_week_workout', workout_id, XP_CONFIG.FIRST_WEEK_WORKOUT, 
        'První trénink v týdnu', { week_key: weekKey });
    }

    // 7. PR check (from client_prs if updated today)
    if (todayPRs < XP_CONFIG.PR_DAILY_CAP) {
      const { data: recentPRs } = await supabase
        .from('client_prs')
        .select('id, pr_definition_id, best_display')
        .eq('client_id', client_id)
        .eq('source_id', workoutData.training_session_id)
        .eq('source_type', 'workout');

      for (const pr of recentPRs || []) {
        if (todayPRs + (recentPRs?.indexOf(pr) || 0) >= XP_CONFIG.PR_DAILY_CAP) break;
        
        // Check if PR already has XP event
        const { data: existingPREvent } = await supabase
          .from('xp_events')
          .select('id')
          .eq('source_id', pr.id)
          .eq('source_type', 'pr')
          .single();

        if (!existingPREvent) {
          addEvent('pr', pr.id, XP_CONFIG.PR_BONUS, `Nový PR: ${pr.best_display}`, {
            pr_definition_id: pr.pr_definition_id,
            best_display: pr.best_display,
          });
        }
      }
    }

    // Insert all events
    if (events.length > 0) {
      const { error: insertError } = await supabase
        .from('xp_events')
        .insert(events);

      if (insertError) {
        console.error('Error inserting XP events:', insertError);
        throw insertError;
      }

      console.log(`[calculate-xp] Inserted ${events.length} XP events for client ${client_id}`);

      // Get old XP level before recalculation
      const { data: oldXPData } = await supabase
        .from('client_xp')
        .select('level, total_xp')
        .eq('client_id', client_id)
        .single();

      const oldLevel = oldXPData?.level || 1;

      // Recalculate client_xp
      const { error: recalcError } = await supabase.rpc('recalculate_client_xp', {
        p_client_id: client_id,
      });

      if (recalcError) {
        console.error('Error recalculating client XP:', recalcError);
      }

      // Get new XP level after recalculation
      const { data: newXPData } = await supabase
        .from('client_xp')
        .select('level, total_xp')
        .eq('client_id', client_id)
        .single();

      const newLevel = newXPData?.level || 1;
      const leveledUp = newLevel > oldLevel;

      if (leveledUp) {
        console.log(`[calculate-xp] Client ${client_id} leveled up from ${oldLevel} to ${newLevel}!`);
      }

      // Check for newly earned badges
      const { data: recentBadges } = await supabase
        .from('client_badges')
        .select('badge_id, earned_at, badge_definitions!inner(name, icon_key, rarity, xp_bonus)')
        .eq('client_id', client_id)
        .not('earned_at', 'is', null)
        .order('earned_at', { ascending: false })
        .limit(3);

      // Filter badges earned in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const newBadges = recentBadges?.filter(b => b.earned_at && b.earned_at > fiveMinutesAgo) || [];

      // Track activity
      await supabase.from('client_portal_activity').insert({
        client_id,
        activity_type: 'xp_earned',
        activity_date: dateStr,
        metadata: {
          total_xp: events.reduce((sum, e) => sum + e.xp_amount, 0),
          events: events.map(e => ({ type: e.source_type, amount: e.xp_amount })),
          leveled_up: leveledUp,
          new_level: leveledUp ? newLevel : null,
        },
      });
    }

    const totalXp = events.reduce((sum, e) => sum + e.xp_amount, 0);
    console.log(`[calculate-xp] Total XP awarded: ${totalXp}`);

    // Get final level info
    const { data: finalXP } = await supabase
      .from('client_xp')
      .select('level')
      .eq('client_id', client_id)
      .single();

    // Check for new badges
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: earnedBadges } = await supabase
      .from('client_badges')
      .select('badge_id, earned_at, badge_definitions!inner(name, icon_key, rarity, xp_bonus)')
      .eq('client_id', client_id)
      .not('earned_at', 'is', null)
      .gte('earned_at', fiveMinutesAgo);

    // Check for new PRs
    const { data: newPRs } = await supabase
      .from('client_prs')
      .select('pr_definition_id, best_display, achieved_at, pr_definitions!inner(name)')
      .eq('client_id', client_id)
      .gte('achieved_at', fiveMinutesAgo);

    return new Response(JSON.stringify({ 
      success: true, 
      total_xp: totalXp,
      events: events.map(e => ({ type: e.source_type, xp: e.xp_amount })),
      celebrations: {
        level_up: events.length > 0 ? {
          // Return level_up info if we have events (XP was awarded)
          new_level: finalXP?.level || 1,
        } : null,
        new_badges: earnedBadges?.map(b => ({
          name: (b.badge_definitions as any).name,
          icon: (b.badge_definitions as any).icon_key,
          rarity: (b.badge_definitions as any).rarity,
          xp_bonus: (b.badge_definitions as any).xp_bonus,
        })) || [],
        new_prs: newPRs?.map(pr => ({
          name: (pr.pr_definitions as any).name,
          value: pr.best_display,
        })) || [],
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[calculate-xp] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function checkWeeklyStreak(
  supabase: any,
  clientId: string,
  weekKey: string,
  addEvent: (type: string, sourceId: string, amount: number, desc: string, meta: Record<string, unknown>) => number
) {
  // Get workout count for this week
  const weekStart = getWeekStartDate(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: weekWorkouts } = await supabase
    .from('client_confirmed_workouts')
    .select('id')
    .eq('client_id', clientId)
    .gte('performed_date', weekStart.toISOString().split('T')[0])
    .lt('performed_date', weekEnd.toISOString().split('T')[0]);

  const workoutCount = weekWorkouts?.length || 0;
  console.log(`[calculate-xp] Week ${weekKey}: ${workoutCount} workouts`);

  // Check each threshold
  for (const [threshold, xpAmount] of Object.entries(XP_CONFIG.WEEKLY_STREAK)) {
    const thresholdNum = parseInt(threshold);
    if (workoutCount >= thresholdNum) {
      // Check if already claimed
      const { data: existingClaim } = await supabase
        .from('weekly_streak_claims')
        .select('id')
        .eq('client_id', clientId)
        .eq('week_key', weekKey)
        .eq('threshold', thresholdNum)
        .single();

      if (!existingClaim) {
        // Claim the streak bonus
        const { error: claimError } = await supabase
          .from('weekly_streak_claims')
          .insert({
            client_id: clientId,
            week_key: weekKey,
            threshold: thresholdNum,
            xp_amount: xpAmount,
          });

        if (!claimError) {
          addEvent('weekly_streak', `${weekKey}-${thresholdNum}`, xpAmount as number, 
            `Týdenní streak: ${thresholdNum}+ tréninků`, {
            week_key: weekKey,
            threshold: thresholdNum,
            workout_count: workoutCount,
          });
        }
      }
    }
  }
}

function getWeekStartDate(weekKey: string): Date {
  const [year, weekPart] = weekKey.split('-W');
  const weekNum = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  return monday;
}

async function checkFirstWorkoutOfWeek(
  supabase: any,
  clientId: string,
  weekKey: string,
  currentWorkoutId: string
): Promise<boolean> {
  // Check if there's already a first_week_workout event for this week
  const { data: existingClaim } = await supabase
    .from('xp_events')
    .select('id')
    .eq('client_id', clientId)
    .eq('source_type', 'first_week_workout')
    .like('description', `%${weekKey}%`)
    .limit(1);

  if (existingClaim && existingClaim.length > 0) {
    return false;
  }

  // Get week boundaries
  const weekStart = getWeekStartDate(weekKey);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Check if this is the first workout in the week
  const { data: weekWorkouts } = await supabase
    .from('client_confirmed_workouts')
    .select('id')
    .eq('client_id', clientId)
    .gte('performed_date', weekStart.toISOString().split('T')[0])
    .lt('performed_date', weekEnd.toISOString().split('T')[0])
    .order('performed_at', { ascending: true })
    .limit(1);

  // If this workout is the first one in the week
  return weekWorkouts?.length > 0 && weekWorkouts[0].id === currentWorkoutId;
}
