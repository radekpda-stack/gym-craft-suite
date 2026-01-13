import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, differenceInDays, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export type InsightType = 'success' | 'warning' | 'info';

export interface ClientInsight {
  id: string;
  type: InsightType;
  icon: string;
  text: string;
  priority: number;
  detail?: {
    title: string;
    description: string;
    metric?: {
      value: string;
      label: string;
      trend?: 'up' | 'down' | 'stable';
    };
    breakdown?: {
      items: { label: string; value: string }[];
    };
    tip?: string;
  };
}

interface InsightData {
  trainingsThisMonth: number;
  trainingsLastMonth: number;
  avgTrainingsPerWeek: number;
  totalTrainings: number;
  currentStreak: number;
  longestStreak: number;
  xpLevel: number;
  xpToNext: number;
  totalXp: number;
  personalRecordsCount: number;
  recentPRs: number;
  creditBalance: number;
  mostTrainedDay: string | null;
  attendanceRate: number;
  lastTrainingDaysAgo: number | null;
  completedChallenges: number;
  activeChallenges: number;
}

export function useClientInsights(clientId?: string) {
  return useQuery({
    queryKey: ['client-insights', clientId],
    queryFn: async (): Promise<ClientInsight[]> => {
      if (!clientId) return [];

      const data = await fetchInsightData(clientId);
      return generateInsights(data);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

async function fetchInsightData(clientId: string): Promise<InsightData> {
  const today = new Date();
  const thisMonthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
  const lastMonthStart = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), 'yyyy-MM-dd');
  const lastMonthEnd = format(new Date(today.getFullYear(), today.getMonth(), 0), 'yyyy-MM-dd');
  const last30Days = format(subDays(today, 30), 'yyyy-MM-dd');
  const last90Days = format(subDays(today, 90), 'yyyy-MM-dd');

  // Parallel fetch all data
  const [
    trainingsThisMonth,
    trainingsLastMonth,
    trainingsLast90,
    xpData,
    streakData,
    prCount,
    recentPRs,
    creditData,
    trainingDays,
    challenges,
  ] = await Promise.all([
    // Trainings this month
    supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('date', thisMonthStart),

    // Trainings last month
    supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd),

    // Trainings last 90 days for avg
    supabase
      .from('training_sessions')
      .select('id, date')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('date', last90Days)
      .order('date', { ascending: false }),

    // XP level
    supabase
      .from('client_xp')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),

    // Streak from login_streaks
    supabase
      .from('client_login_streaks')
      .select('current_streak, longest_streak')
      .eq('client_id', clientId)
      .maybeSingle(),

    // PR count
    supabase
      .from('client_prs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),

    // Recent PRs (last 30 days)
    supabase
      .from('client_prs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('achieved_at', last30Days),

    // Credit balance
    supabase
      .from('credit_transactions')
      .select('amount')
      .eq('client_id', clientId)
      .is('group_id', null),

    // Training days for most common day
    supabase
      .from('training_sessions')
      .select('date')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('date', last90Days),

    // Challenges
    supabase
      .from('challenge_submissions')
      .select('id, challenge_id, challenges!inner(status)')
      .eq('client_id', clientId),
  ]);

  // Calculate most trained day
  const dayCount: Record<number, number> = {};
  (trainingDays.data ?? []).forEach(t => {
    const day = parseISO(t.date).getDay();
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  
  const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  let mostTrainedDay: string | null = null;
  let maxCount = 0;
  Object.entries(dayCount).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostTrainedDay = dayNames[parseInt(day)];
    }
  });

  // Calculate last training days ago
  const trainings90 = trainingsLast90.data ?? [];
  let lastTrainingDaysAgo: number | null = null;
  if (trainings90.length > 0) {
    lastTrainingDaysAgo = differenceInDays(today, parseISO(trainings90[0].date));
  }

  // Calculate attendance rate (trainings per week in last 90 days)
  const weeks = 90 / 7;
  const avgPerWeek = trainings90.length / weeks;

  // Credit balance
  const creditBalance = (creditData.data ?? []).reduce((sum, t) => sum + (t.amount || 0), 0);

  // Challenges count
  const completedChallenges = (challenges.data ?? []).filter(
    (c: any) => c.challenges?.status === 'ended'
  ).length;
  const activeChallenges = (challenges.data ?? []).filter(
    (c: any) => c.challenges?.status === 'active'
  ).length;

  return {
    trainingsThisMonth: trainingsThisMonth.count ?? 0,
    trainingsLastMonth: trainingsLastMonth.count ?? 0,
    avgTrainingsPerWeek: Math.round(avgPerWeek * 10) / 10,
    totalTrainings: trainings90.length,
    currentStreak: streakData.data?.current_streak ?? 0,
    longestStreak: streakData.data?.longest_streak ?? 0,
    xpLevel: xpData.data?.level ?? 1,
    xpToNext: xpData.data?.xp_to_next ?? 100,
    totalXp: xpData.data?.total_xp ?? 0,
    personalRecordsCount: prCount.count ?? 0,
    recentPRs: recentPRs.count ?? 0,
    creditBalance,
    mostTrainedDay,
    attendanceRate: avgPerWeek,
    lastTrainingDaysAgo,
    completedChallenges,
    activeChallenges,
  };
}

function generateInsights(data: InsightData): ClientInsight[] {
  const insights: ClientInsight[] = [];

  // Training comparison with last month
  if (data.trainingsThisMonth > 0 || data.trainingsLastMonth > 0) {
    const diff = data.trainingsThisMonth - data.trainingsLastMonth;
    const percentChange = data.trainingsLastMonth > 0 
      ? Math.round((diff / data.trainingsLastMonth) * 100) 
      : 100;

    if (diff > 0) {
      insights.push({
        id: 'training-growth',
        type: 'success',
        icon: '📈',
        text: `Tento měsíc trénuješ o ${diff} ${diff === 1 ? 'trénink' : 'tréninky'} více než minulý!`,
        priority: 5,
        detail: {
          title: 'Růst tréninkové aktivity',
          description: 'Skvělá práce! Tvoje tréninkové úsilí roste.',
          metric: {
            value: `+${percentChange}%`,
            label: 'Oproti minulému měsíci',
            trend: 'up',
          },
          breakdown: {
            items: [
              { label: 'Tento měsíc', value: `${data.trainingsThisMonth} tréninků` },
              { label: 'Minulý měsíc', value: `${data.trainingsLastMonth} tréninků` },
            ],
          },
          tip: 'Pokračuj v nastaveném tempu, výsledky se brzy projeví!',
        },
      });
    } else if (diff < 0) {
      insights.push({
        id: 'training-decline',
        type: 'warning',
        icon: '⚠️',
        text: `Tento měsíc máš o ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'trénink' : 'tréninky'} méně`,
        priority: 10,
        detail: {
          title: 'Pokles tréninkové aktivity',
          description: 'Tvoje aktivita oproti minulému měsíci klesla. Zkus najít čas na pravidelný trénink.',
          metric: {
            value: `${percentChange}%`,
            label: 'Oproti minulému měsíci',
            trend: 'down',
          },
          breakdown: {
            items: [
              { label: 'Tento měsíc', value: `${data.trainingsThisMonth} tréninků` },
              { label: 'Minulý měsíc', value: `${data.trainingsLastMonth} tréninků` },
            ],
          },
          tip: 'Zarezervuj si další trénink a vrať se do rytmu!',
        },
      });
    }
  }

  // Streak insights
  if (data.currentStreak >= 3) {
    insights.push({
      id: 'streak-active',
      type: 'success',
      icon: '🔥',
      text: `Máš sérii ${data.currentStreak} ${data.currentStreak === 1 ? 'týden' : data.currentStreak < 5 ? 'týdny' : 'týdnů'} v řadě!`,
      priority: 8,
      detail: {
        title: 'Skvělá série tréninků!',
        description: 'Udržuješ si pravidelný tréninkový režim. Neztrácej momentum!',
        metric: {
          value: `${data.currentStreak}`,
          label: 'Týdnů v řadě',
          trend: 'up',
        },
        breakdown: {
          items: [
            { label: 'Aktuální série', value: `${data.currentStreak} týdnů` },
            { label: 'Tvůj rekord', value: `${data.longestStreak} týdnů` },
          ],
        },
        tip: data.currentStreak >= data.longestStreak 
          ? 'Překonáváš svůj rekord! Pokračuj!' 
          : `Do rekordu ti chybí ${data.longestStreak - data.currentStreak} týdnů.`,
      },
    });
  }

  // XP level progress
  if (data.xpToNext <= 50 && data.xpLevel < 20) {
    insights.push({
      id: 'level-up-soon',
      type: 'info',
      icon: '⭐',
      text: `Do dalšího levelu ti chybí jen ${data.xpToNext} XP!`,
      priority: 15,
      detail: {
        title: 'Level up na dosah!',
        description: `Jen pár tréninků a postoupíš na level ${data.xpLevel + 1}.`,
        metric: {
          value: `${data.xpToNext} XP`,
          label: 'Do dalšího levelu',
          trend: 'stable',
        },
        breakdown: {
          items: [
            { label: 'Aktuální level', value: `${data.xpLevel}` },
            { label: 'Celkem XP', value: `${data.totalXp.toLocaleString('cs-CZ')}` },
          ],
        },
        tip: 'Každý trénink ti přináší XP. Čím pravidelnější, tím rychlejší postup!',
      },
    });
  }

  // Personal records
  if (data.recentPRs > 0) {
    insights.push({
      id: 'recent-prs',
      type: 'success',
      icon: '🏆',
      text: `Za poslední měsíc jsi pokořil/a ${data.recentPRs} ${data.recentPRs === 1 ? 'osobní rekord' : data.recentPRs < 5 ? 'osobní rekordy' : 'osobních rekordů'}!`,
      priority: 7,
      detail: {
        title: 'Nové osobní rekordy!',
        description: 'Tvá síla a výkonnost stále roste. Skvělá práce!',
        metric: {
          value: `${data.recentPRs}`,
          label: 'Nových rekordů za 30 dní',
          trend: 'up',
        },
        breakdown: {
          items: [
            { label: 'Celkem rekordů', value: `${data.personalRecordsCount}` },
            { label: 'Nových za měsíc', value: `${data.recentPRs}` },
          ],
        },
        tip: 'Pokračuj v tréninku a sleduj své pokroky v sekci Progres.',
      },
    });
  }

  // Most trained day
  if (data.mostTrainedDay) {
    insights.push({
      id: 'training-day',
      type: 'info',
      icon: '📅',
      text: `${data.mostTrainedDay} je tvůj nejčastější tréninkový den`,
      priority: 25,
      detail: {
        title: 'Tvůj oblíbený tréninkový den',
        description: `Nejvíce tréninků absolvuješ v ${data.mostTrainedDay.toLowerCase()}. Udržuj si tento rytmus!`,
        metric: {
          value: data.mostTrainedDay,
          label: 'Nejčastější den',
          trend: 'stable',
        },
        tip: 'Pravidelnost je klíčem k úspěchu. Drž se svého rozvrhu!',
      },
    });
  }

  // Average trainings per week
  if (data.avgTrainingsPerWeek >= 2) {
    insights.push({
      id: 'avg-weekly',
      type: 'success',
      icon: '💪',
      text: `Průměrně trénuješ ${data.avgTrainingsPerWeek}× týdně`,
      priority: 20,
      detail: {
        title: 'Pravidelnost tréninku',
        description: 'Udržuješ si dobrou tréninkovou frekvenci.',
        metric: {
          value: `${data.avgTrainingsPerWeek}×`,
          label: 'Tréninků týdně',
          trend: data.avgTrainingsPerWeek >= 2 ? 'up' : 'stable',
        },
        tip: data.avgTrainingsPerWeek < 2 
          ? 'Zkus přidat alespoň jeden trénink týdně.' 
          : 'Skvělá frekvence! Tělo má čas na regeneraci.',
      },
    });
  } else if (data.avgTrainingsPerWeek > 0 && data.avgTrainingsPerWeek < 1.5) {
    insights.push({
      id: 'low-frequency',
      type: 'warning',
      icon: '📉',
      text: 'Trénuješ méně než 2× týdně',
      priority: 12,
      detail: {
        title: 'Nízká tréninková frekvence',
        description: 'Pro lepší výsledky zkus přidat alespoň jeden trénink týdně.',
        metric: {
          value: `${data.avgTrainingsPerWeek}×`,
          label: 'Tréninků týdně',
          trend: 'down',
        },
        tip: 'I krátký trénink je lepší než žádný. Zarezervuj si další termín!',
      },
    });
  }

  // Credit warning
  if (data.creditBalance < 500 && data.creditBalance > 0) {
    insights.push({
      id: 'low-credit',
      type: 'warning',
      icon: '💳',
      text: `Kredit: ${data.creditBalance.toLocaleString('cs-CZ')} Kč - blíží se konec`,
      priority: 5,
      detail: {
        title: 'Nízký kredit',
        description: 'Tvůj kredit se blíží ke konci. Doplň ho, aby ses mohl/a dál trénovat.',
        metric: {
          value: `${data.creditBalance.toLocaleString('cs-CZ')} Kč`,
          label: 'Zbývající kredit',
          trend: 'down',
        },
        tip: 'Kontaktuj trenéra pro doplnění kreditu.',
      },
    });
  }

  // No recent training warning
  if (data.lastTrainingDaysAgo !== null && data.lastTrainingDaysAgo > 14) {
    insights.push({
      id: 'no-recent-training',
      type: 'warning',
      icon: '⏰',
      text: `Poslední trénink byl před ${data.lastTrainingDaysAgo} dny`,
      priority: 3,
      detail: {
        title: 'Dlouho jsi netrénoval/a',
        description: 'Tvůj poslední trénink už je nějaký čas. Vrať se do formy!',
        metric: {
          value: `${data.lastTrainingDaysAgo}`,
          label: 'Dní od posledního tréninku',
          trend: 'down',
        },
        tip: 'Zarezervuj si trénink a vrať se do pohybu!',
      },
    });
  }

  // Active challenges
  if (data.activeChallenges > 0) {
    insights.push({
      id: 'active-challenges',
      type: 'info',
      icon: '🎯',
      text: `Účastníš se ${data.activeChallenges} ${data.activeChallenges === 1 ? 'aktivní výzvy' : 'aktivních výzev'}`,
      priority: 18,
      detail: {
        title: 'Aktivní výzvy',
        description: 'Máš rozehrané výzvy. Nezapomeň odevzdat své výsledky!',
        metric: {
          value: `${data.activeChallenges}`,
          label: 'Aktivních výzev',
          trend: 'stable',
        },
        breakdown: {
          items: [
            { label: 'Aktivní výzvy', value: `${data.activeChallenges}` },
            { label: 'Dokončené výzvy', value: `${data.completedChallenges}` },
          ],
        },
      },
    });
  }

  // Completed challenges celebration
  if (data.completedChallenges >= 3) {
    insights.push({
      id: 'challenge-veteran',
      type: 'success',
      icon: '🏅',
      text: `Dokončil/a jsi už ${data.completedChallenges} výzev!`,
      priority: 22,
      detail: {
        title: 'Veterán výzev',
        description: 'Máš za sebou několik dokončených výzev. Jsi soutěživý typ!',
        metric: {
          value: `${data.completedChallenges}`,
          label: 'Dokončených výzev',
          trend: 'up',
        },
      },
    });
  }

  // Total XP milestone
  if (data.totalXp >= 1000) {
    const milestone = Math.floor(data.totalXp / 1000) * 1000;
    insights.push({
      id: 'xp-milestone',
      type: 'success',
      icon: '✨',
      text: `Překonal/a jsi ${milestone.toLocaleString('cs-CZ')} XP!`,
      priority: 28,
      detail: {
        title: 'XP milník!',
        description: `Dosáhl/a jsi impozantního množství zkušeností. Tvá vytrvalost se vyplácí!`,
        metric: {
          value: `${data.totalXp.toLocaleString('cs-CZ')}`,
          label: 'Celkem XP',
          trend: 'up',
        },
      },
    });
  }

  return insights;
}

// Helper to select and rotate insights
export function selectRotatedInsights(
  insights: ClientInsight[],
  maxCount: number = 3,
  seed?: number
): ClientInsight[] {
  if (insights.length === 0) return [];

  // Sort by priority (lower = more important)
  const sorted = [...insights].sort((a, b) => a.priority - b.priority);

  // Separate by type
  const warnings = sorted.filter(i => i.type === 'warning');
  const success = sorted.filter(i => i.type === 'success');
  const info = sorted.filter(i => i.type === 'info');

  const selected: ClientInsight[] = [];

  // Always include warnings first (max 2)
  selected.push(...warnings.slice(0, 2));

  // Add success insights
  const remainingSlots = maxCount - selected.length;
  if (remainingSlots > 0) {
    // Use seed for pseudo-random selection
    const shuffledSuccess = seededShuffle(success, seed);
    selected.push(...shuffledSuccess.slice(0, Math.ceil(remainingSlots / 2)));
  }

  // Fill with info
  const finalSlots = maxCount - selected.length;
  if (finalSlots > 0) {
    const shuffledInfo = seededShuffle(info, seed);
    selected.push(...shuffledInfo.slice(0, finalSlots));
  }

  return selected.slice(0, maxCount);
}

function seededShuffle<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  const s = seed ?? Date.now();
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(s + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
