import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Generate anonymous name from client ID
function generateAnonymousName(clientId: string): string {
  const adjectives = ['Rychlý', 'Silný', 'Vytrvalý', 'Odhodlaný', 'Aktivní', 'Energický', 'Fit', 'Sportovní'];
  const animals = ['Lev', 'Orel', 'Vlk', 'Tygr', 'Medvěd', 'Sokol', 'Jelen', 'Panter'];
  
  const hash = clientId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const adjective = adjectives[hash % adjectives.length];
  const animal = animals[(hash * 7) % animals.length];
  const number = (hash % 99) + 1;
  
  return `${adjective} ${animal} #${number}`;
}

// Helper: Format duration with centiseconds (always show full precision)
// Format: m:ss.SS (e.g., "1:41.35", "0:59.00")
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  // Always show 2 decimal places for consistency
  const secsFormatted = secs.toFixed(2);
  // Pad the integer part of seconds to 2 digits (e.g., "5.00" -> "05.00")
  const paddedSecs = secs < 10 ? `0${secsFormatted}` : secsFormatted;
  return `${mins}:${paddedSecs}`;
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

    const body = await req.json();
    const { 
      action, clientId, trainerId, exerciseName, metricType, groupKey, 
      challengeId, minGroupSize, score_primary, score_secondary, note, 
      video_url, media_urls, teamName, inviteCode, teamId,
      // New params for leaderboard actions
      leaderboardType, genderFilter, exerciseType, cardioMetric,
      // New params for L/R and age filtering
      ageFilter, side
    } = body;

    // Helper: Calculate age from birth date
    function calculateAge(birthDate: string): number {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    // Helper: Filter client IDs by age group
    function filterByAge(clientIds: string[], clientsMap: Map<string, any>, ageGroup: string): string[] {
      if (!ageGroup || ageGroup === 'all') return clientIds;
      
      return clientIds.filter(cid => {
        const client = clientsMap.get(cid);
        if (!client?.birth_date) return false;
        const age = calculateAge(client.birth_date);
        switch (ageGroup) {
          case '20-30': return age >= 20 && age < 30;
          case '30-40': return age >= 30 && age < 40;
          case '40-50': return age >= 40 && age < 50;
          case '50+': return age >= 50;
          default: return true;
        }
      });
    }

    console.log(`[Benchmarks] Action: ${action}, ClientId: ${clientId}, TrainerId: ${trainerId}`);

    // Get trainer's comparison settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('user_id', trainerId)
      .eq('key', 'comparison_settings')
      .single();

    const comparisonSettings = settings?.value || {
      display_mode: 'both',
      min_group_size: 8,
      benchmark_groups_enabled: ['all']
    };

    const effectiveMinGroupSize = minGroupSize || comparisonSettings.min_group_size || 8;

    // ============================================
    // NEW ACTION: get_workouts_leaderboard
    // For "Měsíc" and "Celkem" tabs
    // ============================================
    if (action === 'get_workouts_leaderboard') {
      console.log(`[Benchmarks] Getting workouts leaderboard, type: ${leaderboardType}`);
      
      // Get all clients for this trainer
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, gender, is_self_profile, is_archived')
        .eq('user_id', trainerId)
        .eq('is_archived', false);
      
      if (clientsError) {
        console.error('[Benchmarks] Clients fetch error:', clientsError);
        return new Response(
          JSON.stringify({ error: 'clients_fetch_failed', details: clientsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientIds = allClients?.map(c => c.id) || [];
      if (clientIds.length === 0) {
        return new Response(
          JSON.stringify({ leaderboard: [], client_rank: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get leaderboard settings for all clients
      const { data: leaderboardSettings } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', clientIds);

      const settingsMap = new Map((leaderboardSettings || []).map(s => [s.client_id, s]));
      const clientsMap = new Map((allClients || []).map(c => [c.id, c]));

      // Calculate date ranges
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get confirmed workouts
      const { data: confirmedWorkouts } = await supabase
        .from('client_confirmed_workouts')
        .select('client_id, performed_at, xp')
        .in('client_id', clientIds);

      // Get training sessions (coach confirmed)
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('client_id, date')
        .in('client_id', clientIds)
        .eq('status', 'completed');

      // Aggregate workout data per client
      const clientData: Record<string, { totalWorkouts: number; monthlyWorkouts: number; coachConfirmedRecent: number; totalRecent: number }> = {};
      
      clientIds.forEach(id => {
        clientData[id] = { totalWorkouts: 0, monthlyWorkouts: 0, coachConfirmedRecent: 0, totalRecent: 0 };
      });

      // Count from confirmed workouts (unique dates)
      const workoutDates: Record<string, Set<string>> = {};
      const monthlyDates: Record<string, Set<string>> = {};
      
      clientIds.forEach(id => {
        workoutDates[id] = new Set();
        monthlyDates[id] = new Set();
      });

      confirmedWorkouts?.forEach(w => {
        const date = new Date(w.performed_at);
        const dateKey = date.toISOString().split('T')[0];
        
        if (workoutDates[w.client_id]) {
          workoutDates[w.client_id].add(dateKey);
          if (date >= monthStart) {
            monthlyDates[w.client_id].add(dateKey);
          }
        }
      });

      // Count from training sessions
      trainingSessions?.forEach(t => {
        const date = new Date(t.date);
        const dateKey = date.toISOString().split('T')[0];
        
        if (workoutDates[t.client_id]) {
          workoutDates[t.client_id].add(dateKey);
          if (date >= monthStart) {
            monthlyDates[t.client_id].add(dateKey);
          }
          
          // For verified status
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (date >= thirtyDaysAgo) {
            clientData[t.client_id].coachConfirmedRecent++;
            clientData[t.client_id].totalRecent++;
          }
        }
      });

      // Set workout counts
      clientIds.forEach(id => {
        clientData[id].totalWorkouts = workoutDates[id].size;
        clientData[id].monthlyWorkouts = monthlyDates[id].size;
      });

      // Build leaderboard
      interface LeaderboardEntry {
        client_id: string;
        nickname: string;
        workout_count: number;
        is_verified: boolean;
        rank: number;
        is_anonymous: boolean;
        gender: string | null;
        is_current_client: boolean;
      }

      const entries: LeaderboardEntry[] = clientIds.map(cid => {
        const data = clientData[cid];
        const client = clientsMap.get(cid);
        const clientSettings = settingsMap.get(cid);
        const isSelfProfile = client?.is_self_profile === true;
        const isVisible = isSelfProfile || clientSettings?.leaderboard_visible === true;
        const isVerified = data.totalRecent > 0 
          ? (data.coachConfirmedRecent / data.totalRecent) >= 0.7 
          : false;

        const workoutCount = leaderboardType === 'month' 
          ? data.monthlyWorkouts 
          : data.totalWorkouts;

        // Trainer (is_self_profile) is ALWAYS visible with their name or custom nickname
        // Regular clients need to opt-in AND have a nickname set
        let nickname: string;
        if (isSelfProfile) {
          // Trainer is always visible - use nickname if set, otherwise use name
          nickname = clientSettings?.leaderboard_nickname || client?.name || 'Trenér';
        } else if (isVisible && clientSettings?.leaderboard_nickname) {
          nickname = clientSettings.leaderboard_nickname;
        } else {
          nickname = generateAnonymousName(cid);
        }

        return {
          client_id: cid,
          nickname,
          workout_count: workoutCount,
          is_verified: isVerified,
          rank: 0,
          is_anonymous: !isVisible && !isSelfProfile, // Trainer is never anonymous
          gender: client?.gender || null,
          is_current_client: cid === clientId,
        };
      });

      // Filter out zero workouts and sort
      const filteredEntries = entries
        .filter(e => e.workout_count > 0)
        .sort((a, b) => b.workout_count - a.workout_count);

      // Assign ranks
      filteredEntries.forEach((e, i) => { e.rank = i + 1; });

      // Find current client's rank
      const currentClientEntry = filteredEntries.find(e => e.is_current_client);

      console.log(`[Benchmarks] Workouts leaderboard: ${filteredEntries.length} entries`);

      return new Response(
        JSON.stringify({
          leaderboard: filteredEntries,
          client_rank: currentClientEntry?.rank || null,
          total_participants: filteredEntries.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // NEW ACTION: get_available_exercises
    // For "Cviky" tab - list of exercises with client's percentile
    // ============================================
    if (action === 'get_available_exercises') {
      console.log(`[Benchmarks] Getting available exercises for client: ${clientId}`);

      // Get ALL exercise entries (including plyometrics with distance/height/time)
      // NOW INCLUDING 'side' field for unilateral exercises
      const { data: exerciseData } = await supabase
        .from('exercise_entries')
        .select('exercise_name, exercise_id, client_id, weight_kg, distance_meters, height_cm, time_seconds, side')
        .eq('user_id', trainerId);

      // Get exercise definitions to identify plyometric exercises
      const { data: exerciseDefinitions } = await supabase
        .from('exercises')
        .select('name_cs, default_unit, category, is_time_based, supported_metrics');

      const exerciseDefMap = new Map((exerciseDefinitions || []).map((e: any) => 
        [e.name_cs?.toLowerCase().trim(), e]
      ));

      // Get all cardio entries
      const { data: cardioData } = await supabase
        .from('cardio_entries')
        .select('exercise_name, exercise_id, client_id, distance_meters, duration_seconds')
        .eq('user_id', trainerId);

      interface ExerciseWithPercentile {
        exercise_name: string;
        exercise_id: string | null;
        entry_count: number;
        exercise_type: 'strength' | 'cardio';
        client_percentile: number | null;
        client_best_value: number | null;
        metric_type?: string;
        side?: 'left' | 'right' | null;
      }

      // Process exercise entries - group by exercise AND side for unilateral exercises
      const exerciseByName = new Map<string, { 
        clients: Map<string, { value: number; metric: string }>;
        metric: string;
        exerciseId: string | null;
        side: 'left' | 'right' | null;
      }>();

      (exerciseData || []).forEach((e: any) => {
        const baseName = e.exercise_name.toLowerCase().trim();
        // For unilateral exercises (side = 'left' or 'right'), create separate keys
        const sideValue = (e.side === 'left' || e.side === 'right') ? e.side : null;
        const key = sideValue ? `${baseName}::${sideValue}` : baseName;
        const exerciseDef = exerciseDefMap.get(key);
        
        // Determine which metric to use based on exercise definition and available data
        let metric = 'weight';
        let value: number | null = null;
        
        // Check exercise definition for preferred metric
        const defaultUnit = exerciseDef?.default_unit;
        const category = exerciseDef?.category?.toLowerCase();
        const isTimeBased = exerciseDef?.is_time_based === true;
        const isPlyometric = category === 'plyometrics' || 
          key.includes('skok') || key.includes('jump') || 
          key.includes('výskok') || key.includes('box jump');
        const isDistancePlyometric = key.includes('dálk') || key.includes('long jump') || key.includes('broad');
        const isHeightPlyometric = key.includes('výšk') || key.includes('high jump') || 
          key.includes('vertik') || key.includes('vertical') || key.includes('cmj') || 
          key.includes('squat jump') || key.includes('výskok');

        if (isTimeBased || defaultUnit === 'time_seconds' || 
            key.includes('běh') || key.includes('run') || 
            key.includes('veslo') || key.includes('row') ||
            key.includes('skierg')) {
          // Time-based exercise
          if (e.time_seconds && e.time_seconds > 0) {
            metric = 'time';
            value = e.time_seconds;
          }
        } else if (isPlyometric) {
          if (isDistancePlyometric) {
            // Distance-based plyometric (long jump)
            if (e.distance_meters && e.distance_meters > 0) {
              metric = 'distance';
              value = e.distance_meters;
            }
          } else if (isHeightPlyometric || defaultUnit === 'height_cm') {
            // Height-based plyometric (vertical jump, box jump)
            if (e.height_cm && e.height_cm > 0) {
              metric = 'height';
              value = e.height_cm;
            } else if (e.distance_meters && e.distance_meters > 0) {
              // Fallback to distance_meters if height_cm not available
              metric = 'height';
              value = e.distance_meters * 100; // Convert m to cm
            }
          } else if (e.distance_meters && e.distance_meters > 0) {
            // Generic plyometric with distance data
            metric = 'distance';
            value = e.distance_meters;
          } else if (e.height_cm && e.height_cm > 0) {
            metric = 'height';
            value = e.height_cm;
          }
        } else if (e.weight_kg && e.weight_kg > 0) {
          // Standard strength exercise
          metric = 'weight';
          value = e.weight_kg;
        } else if (e.distance_meters && e.distance_meters > 0) {
          // Has distance data
          metric = 'distance';
          value = e.distance_meters;
        } else if (e.height_cm && e.height_cm > 0) {
          // Has height data
          metric = 'height';
          value = e.height_cm;
        }

        if (value === null) return;

        if (!exerciseByName.has(key)) {
          exerciseByName.set(key, { 
            clients: new Map(), 
            metric,
            exerciseId: e.exercise_id,
            side: sideValue
          });
        }

        const exercise = exerciseByName.get(key)!;
        const clientData = exercise.clients.get(e.client_id);
        
        // For time: lower is better, for others: higher is better
        const isBetter = metric === 'time' 
          ? !clientData || value < clientData.value
          : !clientData || value > clientData.value;
          
        if (isBetter) {
          exercise.clients.set(e.client_id, { value, metric });
        }
      });

      // Calculate percentiles for strength/plyometric exercises
      const strengthResults: ExerciseWithPercentile[] = [];
      exerciseByName.forEach((data, key) => {
        const values = Array.from(data.clients.values()).map(c => c.value);
        const clientData = data.clients.get(clientId);
        
        let percentile: number | null = null;
        if (clientData !== undefined && values.length > 0) {
          const sortedValues = [...values].sort((a, b) => a - b);
          if (data.metric === 'time') {
            // For time: lower is better, so count how many are HIGHER (worse)
            const higherCount = sortedValues.filter(v => v > clientData.value).length;
            percentile = (higherCount / values.length) * 100;
          } else {
            // For weight/distance/height: higher is better
            const lowerCount = sortedValues.filter(v => v < clientData.value).length;
            percentile = (lowerCount / values.length) * 100;
          }
        }

        // Extract base exercise name (remove ::left or ::right suffix if present)
        let displayName = key;
        if (key.includes('::')) {
          const [baseName, sideKey] = key.split('::');
          // Capitalize first letter and add L/R suffix
          displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
          displayName += sideKey === 'left' ? ' (L)' : ' (R)';
        } else {
          displayName = key.charAt(0).toUpperCase() + key.slice(1);
        }

        strengthResults.push({
          exercise_name: displayName,
          exercise_id: data.exerciseId,
          entry_count: values.length,
          exercise_type: 'strength',
          client_percentile: percentile,
          client_best_value: clientData?.value ?? null,
          metric_type: data.metric,
          side: data.side,
        });
      });

      // Process cardio exercises (distance or duration based)
      const cardioByExercise = new Map<string, Map<string, number>>();
      (cardioData || []).forEach((e: any) => {
        const key = e.exercise_name.toLowerCase().trim();
        if (!cardioByExercise.has(key)) {
          cardioByExercise.set(key, new Map());
        }
        const clientMap = cardioByExercise.get(key)!;
        const current = clientMap.get(e.client_id) || 0;
        // Use distance as primary metric for cardio
        if (e.distance_meters && e.distance_meters > current) {
          clientMap.set(e.client_id, e.distance_meters);
        }
      });

      // Calculate percentiles for cardio
      const cardioResults: ExerciseWithPercentile[] = [];
      cardioByExercise.forEach((clientBests, exerciseName) => {
        const values = Array.from(clientBests.values()).sort((a, b) => a - b);
        const clientBest = clientBests.get(clientId);
        
        let percentile: number | null = null;
        if (clientBest !== undefined && values.length > 0) {
          const belowCount = values.filter(v => v < clientBest).length;
          percentile = (belowCount / values.length) * 100;
        }

        cardioResults.push({
          exercise_name: exerciseName,
          exercise_id: null,
          entry_count: values.length,
          exercise_type: 'cardio',
          client_percentile: percentile,
          client_best_value: clientBest ?? null,
        });
      });

      // Filter only exercises where client has records, then categorize by metric_type
      const allResults = [...strengthResults, ...cardioResults]
        .filter(e => e.client_best_value !== null); // Only exercises where client has entries

      // Categorize by metric_type
      const strength = allResults
        .filter(e => e.metric_type === 'weight')
        .sort((a, b) => b.entry_count - a.entry_count);

      const plyometrics = allResults
        .filter(e => e.metric_type === 'distance' || e.metric_type === 'height')
        .sort((a, b) => b.entry_count - a.entry_count);

      const cardio = allResults
        .filter(e => e.metric_type === 'time')
        .sort((a, b) => b.entry_count - a.entry_count);

      console.log(`[Benchmarks] Available exercises: ${strength.length} strength, ${plyometrics.length} plyometrics, ${cardio.length} cardio`);

      return new Response(
        JSON.stringify({ strength, plyometrics, cardio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // NEW ACTION: get_exercise_leaderboard
    // For specific exercise leaderboard
    // ============================================
    if (action === 'get_exercise_leaderboard') {
      console.log(`[Benchmarks] Getting exercise leaderboard: ${exerciseName}, type: ${exerciseType}`);

      // Get all clients for this trainer
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name, gender, is_self_profile, is_archived')
        .eq('user_id', trainerId)
        .eq('is_archived', false);

      const clientsMap = new Map((allClients || []).map(c => [c.id, c]));
      const allClientIds = allClients?.map(c => c.id) || [];

      // Get leaderboard settings
      const { data: leaderboardSettings } = await supabase
        .from('client_leaderboard_settings')
        .select('client_id, leaderboard_visible, leaderboard_nickname')
        .in('client_id', allClientIds);

      const settingsMap = new Map((leaderboardSettings || []).map(s => [s.client_id, s]));

      interface ExerciseLeaderboardEntry {
        rank: number;
        nickname: string;
        client_id: string;
        best_value: number;
        display_value: string;
        achieved_at: string;
        is_anonymous: boolean;
        is_current_client: boolean;
      }

      let leaderboard: ExerciseLeaderboardEntry[] = [];
      let metric = 'weight';
      let unit = 'kg';

      if (exerciseType === 'strength') {
        // Get exercise info if available
        const { data: exerciseInfo } = await supabase
          .from('exercises')
          .select('is_time_based, category, default_unit, supported_metrics')
          .ilike('name_cs', exerciseName)
          .maybeSingle();

        const nameLower = exerciseName.toLowerCase();
        const category = exerciseInfo?.category?.toLowerCase() || '';
        const defaultUnit = exerciseInfo?.default_unit || '';
        
        // Determine exercise type
        const isTimeBased = exerciseInfo?.is_time_based === true ||
          category === 'cardio' ||
          category === 'conditioning' ||
          nameLower.includes('skierg') ||
          nameLower.includes('veslo') ||
          nameLower.includes('rower') ||
          nameLower.includes('běh') ||
          nameLower.includes('run');
          
        const isPlyometric = category === 'plyometrics' || 
          nameLower.includes('skok') || nameLower.includes('jump') || 
          nameLower.includes('výskok') || nameLower.includes('box jump');
          
        const isDistancePlyometric = nameLower.includes('dálk') || 
          nameLower.includes('long jump') || nameLower.includes('broad');
          
        const isHeightPlyometric = nameLower.includes('výšk') || 
          nameLower.includes('high jump') || 
          nameLower.includes('vertik') || nameLower.includes('vertical') || 
          nameLower.includes('cmj') || nameLower.includes('squat jump') || 
          nameLower.includes('výskok') || nameLower.includes('box jump') ||
          defaultUnit === 'height_cm';

        if (isTimeBased) {
          // TIME-BASED: get entries with time_seconds, sort ascending (lower is better)
          metric = 'time';
          unit = 's';

          const { data: entries } = await supabase
            .from('exercise_entries')
            .select('client_id, time_seconds, time_ms, date')
            .eq('user_id', trainerId)
            .ilike('exercise_name', exerciseName)
            .not('time_seconds', 'is', null);

          if (!entries?.length) {
            return new Response(
              JSON.stringify({ 
                leaderboard: [], 
                total_participants: 0, 
                client_rank: null,
                client_percentile: null,
                exercise_name: exerciseName,
                metric: 'time',
                unit: 's'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get unique clients and their BEST (lowest) time
          const clientBests = new Map<string, { timeMs: number; date: string }>();
          entries.forEach((e: any) => {
            if (!e.time_seconds || e.time_seconds <= 0) return;
            
            const timeMs = e.time_ms ?? (e.time_seconds * 1000);
            const existing = clientBests.get(e.client_id);
            
            if (!existing || timeMs < existing.timeMs) {
              clientBests.set(e.client_id, { timeMs, date: e.date });
            }
          });

          let filteredClientIds = Array.from(clientBests.keys());
          if (genderFilter && genderFilter !== 'all') {
            filteredClientIds = filteredClientIds.filter(cid => {
              const client = clientsMap.get(cid);
              return client?.gender === genderFilter;
            });
          }
          // Apply age filter
          filteredClientIds = filterByAge(filteredClientIds, clientsMap, ageFilter);

          leaderboard = filteredClientIds
            .map(cid => {
              const data = clientBests.get(cid)!;
              const client = clientsMap.get(cid);
              const setting = settingsMap.get(cid);
              const isSelfProfile = client?.is_self_profile === true;
              const isVisible = isSelfProfile || setting?.leaderboard_visible === true;

              // Format time with consistent centiseconds: m:ss.SS
              const displayValue = formatDuration(data.timeMs / 1000);

              let nickname: string;
              if (isSelfProfile) {
                nickname = setting?.leaderboard_nickname || client?.name || 'Trenér';
              } else if (isVisible && setting?.leaderboard_nickname) {
                nickname = setting.leaderboard_nickname;
              } else {
                nickname = generateAnonymousName(cid);
              }

              return {
                client_id: cid,
                nickname,
                best_value: data.timeMs,
                display_value: displayValue,
                achieved_at: data.date,
                is_anonymous: !isVisible && !isSelfProfile,
                is_current_client: cid === clientId,
                rank: 0,
              };
            })
            .sort((a, b) => a.best_value - b.best_value);

        } else if (isPlyometric && isDistancePlyometric) {
          // DISTANCE-BASED PLYOMETRIC (long jump, broad jump)
          metric = 'distance';
          unit = 'm';

          let query = supabase
            .from('exercise_entries')
            .select('client_id, distance_meters, date, side')
            .eq('user_id', trainerId)
            .ilike('exercise_name', exerciseName)
            .not('distance_meters', 'is', null);
          
          // Filter by side if provided (for unilateral exercises)
          if (side === 'left' || side === 'right') {
            query = query.eq('side', side);
          }
          
          const { data: entries } = await query;

          if (!entries?.length) {
            return new Response(
              JSON.stringify({ 
                leaderboard: [], 
                total_participants: 0, 
                client_rank: null,
                client_percentile: null,
                exercise_name: exerciseName,
                metric: 'distance',
                unit: 'm'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const clientBests = new Map<string, { distance: number; date: string }>();
          entries.forEach((e: any) => {
            if (!e.distance_meters || e.distance_meters <= 0) return;
            const existing = clientBests.get(e.client_id);
            if (!existing || e.distance_meters > existing.distance) {
              clientBests.set(e.client_id, { distance: e.distance_meters, date: e.date });
            }
          });

          let filteredClientIds = Array.from(clientBests.keys());
          if (genderFilter && genderFilter !== 'all') {
            filteredClientIds = filteredClientIds.filter(cid => {
              const client = clientsMap.get(cid);
              return client?.gender === genderFilter;
            });
          }
          // Apply age filter
          filteredClientIds = filterByAge(filteredClientIds, clientsMap, ageFilter);

          leaderboard = filteredClientIds
            .map(cid => {
              const data = clientBests.get(cid)!;
              const client = clientsMap.get(cid);
              const setting = settingsMap.get(cid);
              const isSelfProfile = client?.is_self_profile === true;
              const isVisible = isSelfProfile || setting?.leaderboard_visible === true;

              let nickname: string;
              if (isSelfProfile) {
                nickname = setting?.leaderboard_nickname || client?.name || 'Trenér';
              } else if (isVisible && setting?.leaderboard_nickname) {
                nickname = setting.leaderboard_nickname;
              } else {
                nickname = generateAnonymousName(cid);
              }

              return {
                client_id: cid,
                nickname,
                best_value: data.distance,
                display_value: `${data.distance.toFixed(2)} m`,
                achieved_at: data.date,
                is_anonymous: !isVisible && !isSelfProfile,
                is_current_client: cid === clientId,
                rank: 0,
              };
            })
            .sort((a, b) => b.best_value - a.best_value);

        } else if (isPlyometric && isHeightPlyometric) {
          // HEIGHT-BASED PLYOMETRIC (high jump, vertical jump, box jump)
          metric = 'height';
          unit = 'cm';

          let query = supabase
            .from('exercise_entries')
            .select('client_id, height_cm, distance_meters, date, side')
            .eq('user_id', trainerId)
            .ilike('exercise_name', exerciseName);
          
          // Filter by side if provided (for unilateral exercises)
          if (side === 'left' || side === 'right') {
            query = query.eq('side', side);
          }
          
          const { data: entries } = await query;

          if (!entries?.length) {
            return new Response(
              JSON.stringify({ 
                leaderboard: [], 
                total_participants: 0, 
                client_rank: null,
                client_percentile: null,
                exercise_name: exerciseName,
                metric: 'height',
                unit: 'cm'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const clientBests = new Map<string, { height: number; date: string }>();
          entries.forEach((e: any) => {
            // Prefer height_cm, fallback to distance_meters * 100
            let height = e.height_cm;
            if (!height && e.distance_meters) {
              height = e.distance_meters * 100;
            }
            if (!height || height <= 0) return;
            
            const existing = clientBests.get(e.client_id);
            if (!existing || height > existing.height) {
              clientBests.set(e.client_id, { height, date: e.date });
            }
          });

          let filteredClientIds = Array.from(clientBests.keys());
          if (genderFilter && genderFilter !== 'all') {
            filteredClientIds = filteredClientIds.filter(cid => {
              const client = clientsMap.get(cid);
              return client?.gender === genderFilter;
            });
          }
          // Apply age filter
          filteredClientIds = filterByAge(filteredClientIds, clientsMap, ageFilter);

          leaderboard = filteredClientIds
            .map(cid => {
              const data = clientBests.get(cid)!;
              const client = clientsMap.get(cid);
              const setting = settingsMap.get(cid);
              const isSelfProfile = client?.is_self_profile === true;
              const isVisible = isSelfProfile || setting?.leaderboard_visible === true;

              let nickname: string;
              if (isSelfProfile) {
                nickname = setting?.leaderboard_nickname || client?.name || 'Trenér';
              } else if (isVisible && setting?.leaderboard_nickname) {
                nickname = setting.leaderboard_nickname;
              } else {
                nickname = generateAnonymousName(cid);
              }

              return {
                client_id: cid,
                nickname,
                best_value: data.height,
                display_value: `${data.height.toFixed(0)} cm`,
                achieved_at: data.date,
                is_anonymous: !isVisible && !isSelfProfile,
                is_current_client: cid === clientId,
                rank: 0,
              };
            })
            .sort((a, b) => b.best_value - a.best_value);

        } else {
          // WEIGHT-BASED: default strength exercise
          const { data: entries } = await supabase
            .from('exercise_entries')
            .select('client_id, weight_kg, date')
            .eq('user_id', trainerId)
            .ilike('exercise_name', exerciseName)
            .not('weight_kg', 'is', null)
            .order('weight_kg', { ascending: false });

          if (!entries?.length) {
            return new Response(
              JSON.stringify({ 
                leaderboard: [], 
                total_participants: 0, 
                client_rank: null,
                client_percentile: null,
                exercise_name: exerciseName,
                metric: 'weight',
                unit: 'kg'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const clientBests = new Map<string, { weight: number; date: string }>();
          entries.forEach((e: any) => {
            const existing = clientBests.get(e.client_id);
            if (!existing || (e.weight_kg && e.weight_kg > existing.weight)) {
              clientBests.set(e.client_id, { weight: e.weight_kg, date: e.date });
            }
          });

          let filteredClientIds = Array.from(clientBests.keys());
          if (genderFilter && genderFilter !== 'all') {
            filteredClientIds = filteredClientIds.filter(cid => {
              const client = clientsMap.get(cid);
              return client?.gender === genderFilter;
            });
          }
          // Apply age filter
          filteredClientIds = filterByAge(filteredClientIds, clientsMap, ageFilter);

          leaderboard = filteredClientIds
            .map(cid => {
              const data = clientBests.get(cid)!;
              const client = clientsMap.get(cid);
              const setting = settingsMap.get(cid);
              const isSelfProfile = client?.is_self_profile === true;
              const isVisible = isSelfProfile || setting?.leaderboard_visible === true;

              let nickname: string;
              if (isSelfProfile) {
                nickname = setting?.leaderboard_nickname || client?.name || 'Trenér';
              } else if (isVisible && setting?.leaderboard_nickname) {
                nickname = setting.leaderboard_nickname;
              } else {
                nickname = generateAnonymousName(cid);
              }

              return {
                client_id: cid,
                nickname,
                best_value: data.weight,
                display_value: `${data.weight} kg`,
                achieved_at: data.date,
                is_anonymous: !isVisible && !isSelfProfile,
                is_current_client: cid === clientId,
                rank: 0,
              };
            })
            .sort((a, b) => b.best_value - a.best_value);
        }

      } else {
        // CARDIO
        const metricToUse = cardioMetric || 'distance';
        metric = metricToUse;
        unit = metricToUse === 'distance' ? 'm' : 's';

        const { data: entries } = await supabase
          .from('cardio_entries')
          .select('client_id, distance_meters, duration_seconds, date')
          .eq('user_id', trainerId)
          .ilike('exercise_name', exerciseName);

        if (!entries?.length) {
          return new Response(
            JSON.stringify({ 
              leaderboard: [], 
              total_participants: 0, 
              client_rank: null,
              client_percentile: null,
              exercise_name: exerciseName,
              metric: metricToUse,
              unit
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get unique clients and their best performance
        const clientBests = new Map<string, { value: number; date: string }>();
        
        entries.forEach((e: any) => {
          const value = metricToUse === 'distance' 
            ? (e.distance_meters || 0) 
            : (e.duration_seconds || 0);
          
          if (value <= 0) return;
          
          const existing = clientBests.get(e.client_id);
          const isBetter = metricToUse === 'distance'
            ? value > (existing?.value || 0)
            : !existing || value < existing.value;
          
          if (isBetter) {
            clientBests.set(e.client_id, { value, date: e.date });
          }
        });

        // Filter by gender if needed
        let filteredClientIds = Array.from(clientBests.keys());
        if (genderFilter && genderFilter !== 'all') {
          filteredClientIds = filteredClientIds.filter(cid => {
            const client = clientsMap.get(cid);
            return client?.gender === genderFilter;
          });
        }
        // Apply age filter
        filteredClientIds = filterByAge(filteredClientIds, clientsMap, ageFilter);

        // Build leaderboard
        leaderboard = filteredClientIds
          .map(cid => {
            const data = clientBests.get(cid)!;
            const client = clientsMap.get(cid);
            const setting = settingsMap.get(cid);
            const isSelfProfile = client?.is_self_profile === true;
            const isVisible = isSelfProfile || setting?.leaderboard_visible === true;

            let displayValue: string;
            if (metricToUse === 'distance') {
              displayValue = data.value >= 1000 
                ? `${(data.value / 1000).toFixed(2)} km` 
                : `${data.value} m`;
            } else {
              displayValue = formatDuration(data.value);
            }

            // Trainer (is_self_profile) is ALWAYS visible with their name or custom nickname
            let nickname: string;
            if (isSelfProfile) {
              nickname = setting?.leaderboard_nickname || client?.name || 'Trenér';
            } else if (isVisible && setting?.leaderboard_nickname) {
              nickname = setting.leaderboard_nickname;
            } else {
              nickname = generateAnonymousName(cid);
            }

            return {
              client_id: cid,
              nickname,
              best_value: data.value,
              display_value: displayValue,
              achieved_at: data.date,
              is_anonymous: !isVisible && !isSelfProfile, // Trainer is never anonymous
              is_current_client: cid === clientId,
              rank: 0,
            };
          })
          .sort((a, b) => metricToUse === 'distance' 
            ? b.best_value - a.best_value
            : a.best_value - b.best_value
          );
      }

      // Assign ranks
      leaderboard.forEach((e, i) => { e.rank = i + 1; });

      // Find current client's position
      const clientEntry = leaderboard.find(e => e.is_current_client);
      const clientPercentile = clientEntry 
        ? ((leaderboard.length - clientEntry.rank) / leaderboard.length) * 100
        : null;

      console.log(`[Benchmarks] Exercise leaderboard: ${leaderboard.length} entries`);

      return new Response(
        JSON.stringify({
          leaderboard: leaderboard.slice(0, 20),
          total_participants: leaderboard.length,
          client_rank: clientEntry?.rank || null,
          client_percentile: clientPercentile,
          exercise_name: exerciseName,
          metric,
          unit,
          gender_filter: genderFilter || 'all',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // EXISTING ACTIONS (unchanged)
    // ============================================

    // Validate client has opt-in for benchmarks
    if (action === 'get_benchmark' || action === 'get_leaderboard') {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('allow_anonymous_benchmarks, allow_challenges_participation, gender')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('[Benchmarks] Client fetch error:', clientError);
        return new Response(
          JSON.stringify({ error: 'client_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!client.allow_anonymous_benchmarks && action === 'get_benchmark') {
        return new Response(
          JSON.stringify({ 
            error: 'opt_in_required', 
            message: 'Client has not opted in to anonymous benchmarks' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get_benchmark') {
      // Call the SQL function
      const { data, error } = await supabase.rpc('calculate_exercise_benchmark', {
        p_exercise_name: exerciseName,
        p_trainer_id: trainerId,
        p_client_id: clientId,
        p_metric_type: metricType || 'strength',
        p_group_key: groupKey || 'all',
        p_min_group_size: effectiveMinGroupSize
      });

      if (error) {
        console.error('[Benchmarks] RPC error:', error);
        return new Response(
          JSON.stringify({ error: 'calculation_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Benchmarks] Benchmark result:', data);

      return new Response(
        JSON.stringify({ 
          ...data,
          display_mode: comparisonSettings.display_mode,
          available_groups: comparisonSettings.benchmark_groups_enabled || ['all']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_leaderboard') {
      const { data, error } = await supabase.rpc('get_challenge_leaderboard', {
        p_challenge_id: challengeId,
        p_client_id: clientId,
        p_min_group_size: effectiveMinGroupSize
      });

      if (error) {
        console.error('[Benchmarks] Leaderboard RPC error:', error);
        return new Response(
          JSON.stringify({ error: 'leaderboard_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ...data,
          display_mode: comparisonSettings.display_mode
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_active_challenges') {
      const now = new Date().toISOString();
      
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'published')
        .eq('created_by_user_id', trainerId)
        .lte('start_at', now)
        .gte('end_at', now)
        .order('start_at', { ascending: false });

      if (error) {
        console.error('[Benchmarks] Challenges fetch error:', error);
        return new Response(
          JSON.stringify({ error: 'fetch_failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client's submissions for these challenges
      const challengeIds = challenges?.map(c => c.id) || [];
      
      let submissions: any[] = [];
      if (challengeIds.length > 0) {
        const { data: subs } = await supabase
          .from('challenge_submissions')
          .select('*')
          .eq('client_id', clientId)
          .in('challenge_id', challengeIds)
          .order('submitted_at', { ascending: false });
        
        submissions = subs || [];
      }

      // Get participant counts for each challenge (unique clients, not submissions)
      const participantCounts: Record<string, number> = {};
      for (const challenge of challenges || []) {
        // Count unique clients who submitted to this challenge
        const { data: uniqueClients } = await supabase
          .from('challenge_submissions')
          .select('client_id')
          .eq('challenge_id', challenge.id);
        
        // Get unique client count
        const uniqueClientIds = new Set(uniqueClients?.map(s => s.client_id) || []);
        participantCounts[challenge.id] = uniqueClientIds.size;
      }

      return new Response(
        JSON.stringify({
          challenges: challenges || [],
          clientSubmissions: submissions,
          participantCounts,
          display_mode: comparisonSettings.display_mode,
          min_group_size: effectiveMinGroupSize
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'submit_challenge') {
      // Validate client can participate
      const { data: client } = await supabase
        .from('clients')
        .select('allow_challenges_participation')
        .eq('id', clientId)
        .single();

      // Get challenge to check if team challenge
      const { data: challenge } = await supabase
        .from('challenges')
        .select('is_team_challenge')
        .eq('id', challengeId)
        .single();

      // Get or create pseudonym
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      // Get client's team if this is a team challenge
      let clientTeamId = null;
      if (challenge?.is_team_challenge) {
        const { data: membership } = await supabase
          .from('challenge_team_members')
          .select('team_id')
          .eq('client_id', clientId)
          .maybeSingle();
        
        if (membership) {
          // Verify team belongs to this challenge
          const { data: team } = await supabase
            .from('challenge_teams')
            .select('id')
            .eq('id', membership.team_id)
            .eq('challenge_id', challengeId)
            .single();
          
          if (team) {
            clientTeamId = team.id;
          }
        }
      }

      // Insert submission
      const { data: submission, error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: challengeId,
          client_id: clientId,
          score_primary,
          score_secondary,
          note,
          video_url,
          media_urls: media_urls || null,
          team_id: clientTeamId,
          status: 'approved' // Auto-approve for MVP
        })
        .select()
        .single();

      if (error) {
        console.error('[Benchmarks] Submission error:', error);
        return new Response(
          JSON.stringify({ error: 'submission_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Benchmarks] Submission created:', submission.id);

      return new Response(
        JSON.stringify({ success: true, submission }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TEAM ACTIONS
    if (action === 'create_team') {
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('challenge_teams')
        .insert({
          challenge_id: challengeId,
          team_name: teamName,
          captain_client_id: clientId,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (teamError) {
        console.error('[Benchmarks] Team creation error:', teamError);
        return new Response(
          JSON.stringify({ error: 'team_creation_failed', details: teamError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add captain as first member
      await supabase
        .from('challenge_team_members')
        .insert({
          team_id: team.id,
          client_id: clientId,
          role: 'captain',
        });

      // Ensure pseudonym exists
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      console.log('[Benchmarks] Team created:', team.id);

      return new Response(
        JSON.stringify({ success: true, team, invite_code: inviteCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'join_team') {
      // Find team by invite code
      const { data: team, error: teamError } = await supabase
        .from('challenge_teams')
        .select('*, challenge:challenges(*)')
        .eq('invite_code', inviteCode)
        .eq('challenge_id', challengeId)
        .single();

      if (teamError || !team) {
        return new Response(
          JSON.stringify({ error: 'team_not_found', message: 'Neplatný kód pozvánky' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if team is full
      const challenge = team.challenge as any;
      if (team.member_count >= (challenge.max_team_size || 4)) {
        return new Response(
          JSON.stringify({ error: 'team_full', message: 'Tým je již plný' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if client is already in a team for this challenge
      const { data: existingMembership } = await supabase
        .from('challenge_team_members')
        .select('id, team:challenge_teams!inner(challenge_id)')
        .eq('client_id', clientId)
        .eq('team.challenge_id', challengeId)
        .maybeSingle();

      if (existingMembership) {
        return new Response(
          JSON.stringify({ error: 'already_in_team', message: 'Již jsi v týmu pro tuto výzvu' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add member
      const { error: memberError } = await supabase
        .from('challenge_team_members')
        .insert({
          team_id: team.id,
          client_id: clientId,
          role: 'member',
        });

      if (memberError) {
        console.error('[Benchmarks] Join team error:', memberError);
        return new Response(
          JSON.stringify({ error: 'join_failed', details: memberError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Ensure pseudonym exists
      await supabase.rpc('get_or_create_challenge_pseudonym', {
        p_challenge_id: challengeId,
        p_client_id: clientId
      });

      // Update member count
      await supabase
        .from('challenge_teams')
        .update({ member_count: team.member_count + 1 })
        .eq('id', team.id);

      console.log('[Benchmarks] Joined team:', team.id);

      return new Response(
        JSON.stringify({ success: true, team_id: team.id, team_name: team.team_name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leave_team') {
      // Get membership
      const { data: membership } = await supabase
        .from('challenge_team_members')
        .select('*, team:challenge_teams(*)')
        .eq('client_id', clientId)
        .eq('team_id', teamId)
        .single();

      if (!membership) {
        return new Response(
          JSON.stringify({ error: 'not_in_team' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const team = membership.team as any;

      // If captain leaves, delete the whole team
      if (membership.role === 'captain') {
        await supabase
          .from('challenge_teams')
          .delete()
          .eq('id', teamId);

        console.log('[Benchmarks] Team deleted (captain left):', teamId);
      } else {
        // Remove member
        await supabase
          .from('challenge_team_members')
          .delete()
          .eq('id', membership.id);

        // Update member count
        await supabase
          .from('challenge_teams')
          .update({ member_count: Math.max(0, team.member_count - 1) })
          .eq('id', teamId);

        console.log('[Benchmarks] Left team:', teamId);
      }

      // Remove team_id from client's submissions
      await supabase
        .from('challenge_submissions')
        .update({ team_id: null })
        .eq('client_id', clientId)
        .eq('team_id', teamId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_team_leaderboard') {
      // Get all teams for this challenge sorted by score
      const { data: teams, error: teamsError } = await supabase
        .from('challenge_teams')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('total_score', { ascending: false });

      if (teamsError) {
        return new Response(
          JSON.stringify({ error: 'fetch_failed', details: teamsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find client's team
      const { data: clientMembership } = await supabase
        .from('challenge_team_members')
        .select('team_id')
        .eq('client_id', clientId)
        .maybeSingle();

      const clientTeamId = clientMembership?.team_id;

      const teamsWithRanks = (teams || []).map((team, index) => ({
        rank: index + 1,
        team_id: team.id,
        team_name: team.team_name,
        total_score: team.total_score || 0,
        member_count: team.member_count || 0,
        is_my_team: team.id === clientTeamId,
      }));

      const myTeamRank = teamsWithRanks.find(t => t.is_my_team)?.rank;

      return new Response(
        JSON.stringify({ teams: teamsWithRanks, my_team_rank: myTeamRank }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'unknown_action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Benchmarks] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
