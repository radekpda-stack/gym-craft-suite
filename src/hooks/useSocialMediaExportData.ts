import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, startOfYear, subMonths, format, differenceInMonths, differenceInYears } from 'date-fns';
import type { SocialExportData, ExportPeriod } from '@/types/socialExport';

interface UseSocialMediaExportDataOptions {
  period: ExportPeriod;
  customStart?: Date;
  customEnd?: Date;
}

export function useSocialMediaExportData(options: UseSocialMediaExportDataOptions) {
  const { period, customStart, customEnd } = options;

  return useQuery({
    queryKey: ['social-media-export-data', period, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: async (): Promise<SocialExportData> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (period) {
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          break;
        case 'custom':
          startDate = customStart || startOfYear(now);
          endDate = customEnd || now;
          break;
        case 'all':
        default:
          // Get first training date
          const { data: firstTraining } = await supabase
            .from('training_sessions')
            .select('date')
            .eq('user_id', user.id)
            .order('date', { ascending: true })
            .limit(1)
            .single();
          startDate = firstTraining ? new Date(firstTraining.date) : subMonths(now, 12);
      }

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      const monthStartStr = format(startOfMonth(now), 'yyyy-MM-dd');
      const yearStartStr = format(startOfYear(now), 'yyyy-MM-dd');

      // Parallel queries
      const [
        clientsResult,
        trainingsResult,
        trainingsMonthResult,
        trainingsYearResult,
        exerciseEntriesResult,
        exerciseEntriesMonthResult,
        exerciseEntriesYearResult,
        challengesResult,
        exercisesResult,
      ] = await Promise.all([
        // Clients with handedness and gender
        supabase
          .from('clients')
          .select('id, name, gender, handedness, birth_date, created_at, is_archived')
          .eq('user_id', user.id)
          .eq('is_archived', false),

        // All completed trainings in period
        supabase
          .from('training_sessions')
          .select('id, date, duration, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', startStr)
          .lte('date', endStr),

        // This month trainings
        supabase
          .from('training_sessions')
          .select('id, date, duration')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', monthStartStr),

        // This year trainings
        supabase
          .from('training_sessions')
          .select('id, date, duration')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', yearStartStr),

        // Exercise entries in period
        supabase
          .from('exercise_entries')
          .select('id, exercise_name, weight_kg, reps, is_pr, client_id, clients(gender)')
          .eq('user_id', user.id)
          .gte('date', startStr)
          .lte('date', endStr),

        // Exercise entries this month
        supabase
          .from('exercise_entries')
          .select('id, is_pr, weight_kg, exercise_name, client_id, clients(name)')
          .eq('user_id', user.id)
          .gte('date', monthStartStr),

        // Exercise entries this year
        supabase
          .from('exercise_entries')
          .select('id, is_pr')
          .eq('user_id', user.id)
          .gte('date', yearStartStr),

        // Active challenges
        supabase
          .from('challenges')
          .select('id, status')
          .eq('created_by_user_id', user.id),

        // Unique exercises
        supabase
          .from('exercises')
          .select('id, name, movement_pattern')
          .eq('user_id', user.id)
          .eq('is_archived', false),
      ]);

      const clients = clientsResult.data || [];
      const trainings = trainingsResult.data || [];
      const trainingsMonth = trainingsMonthResult.data || [];
      const trainingsYear = trainingsYearResult.data || [];
      const exerciseEntries = exerciseEntriesResult.data || [];
      const exerciseEntriesMonth = exerciseEntriesMonthResult.data || [];
      const exerciseEntriesYear = exerciseEntriesYearResult.data || [];
      const challenges = challengesResult.data || [];
      const exercises = exercisesResult.data || [];

      // Community stats
      const activeClients = clients.length;
      const maleClients = clients.filter(c => c.gender === 'male').length;
      const femaleClients = clients.filter(c => c.gender === 'female').length;
      const leftHandedClients = clients.filter(c => c.handedness === 'left').length;
      const rightHandedClients = clients.filter(c => c.handedness === 'right').length;

      // New clients this month
      const newClientsThisMonth = clients.filter(c => {
        const created = new Date(c.created_at);
        return created >= startOfMonth(now);
      }).length;

      // Average client age
      const clientsWithAge = clients.filter(c => c.birth_date);
      const avgClientAge = clientsWithAge.length > 0
        ? Math.round(clientsWithAge.reduce((sum, c) => {
            const age = differenceInYears(now, new Date(c.birth_date!));
            return sum + age;
          }, 0) / clientsWithAge.length)
        : null;

      // Average and longest client lifetime
      const clientLifetimes = clients.map(c => differenceInMonths(now, new Date(c.created_at)));
      const avgClientLifetimeMonths = clientLifetimes.length > 0
        ? Math.round(clientLifetimes.reduce((a, b) => a + b, 0) / clientLifetimes.length)
        : 0;
      const longestClientMonths = clientLifetimes.length > 0
        ? Math.max(...clientLifetimes)
        : 0;

      // Training stats
      const trainingsTotal = trainings.length;
      const trainingsThisMonth = trainingsMonth.length;
      const trainingsThisYear = trainingsYear.length;

      // Hours calculation (duration in minutes)
      const hoursTotal = Math.round(trainings.reduce((sum, t) => sum + (t.duration || 60), 0) / 60);
      const hoursThisMonth = Math.round(trainingsMonth.reduce((sum, t) => sum + (t.duration || 60), 0) / 60);
      const hoursThisYear = Math.round(trainingsYear.reduce((sum, t) => sum + (t.duration || 60), 0) / 60);

      // Average trainings per week
      const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const weeks = totalDays / 7;
      const avgTrainingsPerWeek = Math.round((trainingsTotal / weeks) * 10) / 10;

      // Most active day
      const dayCounts: Record<string, number> = {};
      const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
      trainings.forEach(t => {
        const day = dayNames[new Date(t.date).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const mostActiveDay = Object.entries(dayCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Pondělí';

      // Record trainings in single day
      const dateCounts: Record<string, number> = {};
      trainings.forEach(t => {
        const dateKey = t.date.split('T')[0];
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      });
      const recordTrainingsInDay = Math.max(...Object.values(dateCounts), 0);

      // PR stats
      const prsTotal = exerciseEntries.filter(e => e.is_pr).length;
      const prsThisMonth = exerciseEntriesMonth.filter(e => e.is_pr).length;
      const prsThisYear = exerciseEntriesYear.filter(e => e.is_pr).length;

      // PRs by gender
      const malePRs = exerciseEntries.filter(e => e.is_pr && (e.clients as any)?.gender === 'male').length;
      const femalePRs = exerciseEntries.filter(e => e.is_pr && (e.clients as any)?.gender === 'female').length;

      // PR velocity (per week)
      const prVelocity = Math.round((prsTotal / Math.max(1, weeks)) * 10) / 10;

      // Max weight lifted
      const entriesWithWeight = exerciseEntriesMonth.filter(e => e.weight_kg && e.weight_kg > 0);
      const maxWeightEntry = entriesWithWeight.sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0))[0];
      const maxWeightLifted = maxWeightEntry?.weight_kg || null;
      const maxWeightExercise = maxWeightEntry?.exercise_name || null;
      const maxWeightClient = (maxWeightEntry?.clients as any)?.name || null;

      // Total volume in tons
      const totalVolume = exerciseEntries.reduce((sum, e) => {
        const weight = e.weight_kg || 0;
        const reps = e.reps || 0;
        return sum + (weight * reps);
      }, 0);
      const totalVolumeTons = Math.round((totalVolume / 1000) * 10) / 10;

      // Exercise stats
      const uniqueExercises = exercises.length;

      // Top exercises by usage
      const exerciseCounts: Record<string, number> = {};
      exerciseEntries.forEach(e => {
        exerciseCounts[e.exercise_name] = (exerciseCounts[e.exercise_name] || 0) + 1;
      });
      const topExercises = Object.entries(exerciseCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      // Top movement pattern
      const patternCounts: Record<string, number> = {};
      exercises.forEach(e => {
        if (e.movement_pattern) {
          patternCounts[e.movement_pattern] = (patternCounts[e.movement_pattern] || 0) + 1;
        }
      });
      const topMovementPattern = Object.entries(patternCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

      // Challenge stats
      const activeChallenges = challenges.filter(c => c.status === 'active').length;

      // Get challenge participants count
      const { count: totalChallengeParticipants } = await supabase
        .from('challenge_participants')
        .select('*', { count: 'exact', head: true });

      // Challenge completion rate (simplified)
      const { data: submissions } = await supabase
        .from('challenge_submissions')
        .select('status')
        .eq('status', 'confirmed');
      
      const completedSubmissions = submissions?.length || 0;
      const challengeCompletionRate = totalChallengeParticipants && totalChallengeParticipants > 0
        ? Math.round((completedSubmissions / totalChallengeParticipants) * 100)
        : null;

      return {
        // Community
        activeClients,
        newClientsThisMonth,
        maleClients,
        femaleClients,
        leftHandedClients,
        rightHandedClients,
        avgClientAge,
        avgClientLifetimeMonths,
        longestClientMonths,

        // Trainings
        trainingsThisMonth,
        trainingsThisYear,
        trainingsTotal,
        hoursThisMonth,
        hoursThisYear,
        hoursTotal,
        avgTrainingsPerWeek,
        mostActiveDay,
        recordTrainingsInDay,

        // Performance
        prsThisMonth,
        prsThisYear,
        prsTotal,
        maxWeightLifted,
        maxWeightExercise,
        maxWeightClient,
        totalVolumeTons,
        prVelocity,
        malePRs,
        femalePRs,

        // Exercises
        uniqueExercises,
        topExercises,
        topMovementPattern,

        // Challenges
        activeChallenges,
        totalChallengeParticipants: totalChallengeParticipants || 0,
        challengeCompletionRate,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
