import { motion } from 'framer-motion';
import { GaugeCard } from '@/components/charts/GaugeCard';
import { SparklineCard } from '@/components/charts/SparklineCard';
import { AnimatedCounter } from '@/components/client-portal/leaderboard/AnimatedCounter';
import { Trophy, Dumbbell, Calendar, Users, Clock, Activity, Target, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface TrainerStats {
  trainer: {
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    specializations: string[] | null;
    experienceYears: number | null;
  };
  metrics: {
    activeClients: number;
    totalClients: number;
    clientLimit: number;
    capacityUtilization: number;
    totalHours: number;
    totalTrainings: number;
    currentMonthTrainings: number;
    currentMonthTotal: number;
    trendPercent: number;
    avgRpe: number | null;
    uniqueExercises: number;
    trainerSince: string | null;
  };
  topPRs: Array<{ name: string; weight: number; reps: number }>;
  monthlyTrend: Array<{ value: number }>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export function TrainerStatsShowcase({ data }: { data: TrainerStats }) {
  const { trainer, metrics, topPRs, monthlyTrend } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
          {trainer.avatarUrl && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-4"
            >
              <img
                src={trainer.avatarUrl}
                alt={trainer.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto border-2 border-primary/30 shadow-lg shadow-primary/10 object-cover"
              />
            </motion.div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {trainer.displayName}
          </h1>
          {trainer.bio && (
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{trainer.bio}</p>
          )}
          {trainer.specializations && trainer.specializations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {trainer.specializations.map((s) => (
                <span
                  key={s}
                  className="text-[10px] uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {metrics.trainerSince && (
            <p className="mt-3 text-xs text-muted-foreground">
              Trenér od {format(new Date(metrics.trainerSince), 'LLLL yyyy', { locale: cs })}
            </p>
          )}
        </div>
      </motion.div>

      {/* Main Gauges Grid */}
      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <GaugeCard
              title="Aktivní klienti"
              value={metrics.activeClients}
              maxValue={metrics.clientLimit}
              displayValue={String(metrics.activeClients)}
              sublabel={`z ${metrics.clientLimit}`}
              variant="primary"
              size="md"
            />
          </motion.div>
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
            <GaugeCard
              title="Vytížení"
              value={metrics.capacityUtilization}
              maxValue={100}
              displayValue={`${metrics.capacityUtilization}%`}
              sublabel="kapacita"
              variant="blue"
              size="md"
            />
          </motion.div>
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}>
            <GaugeCard
              title="Odtrénováno hodin"
              value={Math.min(metrics.totalHours, 5000)}
              maxValue={5000}
              displayValue={String(metrics.totalHours)}
              sublabel="celkem"
              variant="success"
              size="md"
            />
          </motion.div>
          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
            <GaugeCard
              title="Tento měsíc"
              value={metrics.currentMonthTrainings}
              maxValue={Math.max(metrics.currentMonthTotal, 30)}
              displayValue={String(metrics.currentMonthTrainings)}
              sublabel="tréninků"
              variant="warning"
              size="md"
              description={
                metrics.trendPercent !== 0
                  ? `${metrics.trendPercent > 0 ? '+' : ''}${metrics.trendPercent}% vs průměr`
                  : undefined
              }
            />
          </motion.div>
        </div>

        {/* Sparkline + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}>
            <SparklineCard
              title="Tréninky za rok"
              value={metrics.totalTrainings}
              subtitle="celkem dokončených"
              data={monthlyTrend}
              variant="primary"
              icon={<Calendar className="w-4 h-4" />}
            />
          </motion.div>
          <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
            <SparklineCard
              title="Cviky v knihovně"
              value={metrics.uniqueExercises}
              subtitle="unikátních cviků"
              data={monthlyTrend}
              variant="blue"
              chartType="line"
              icon={<Dumbbell className="w-4 h-4" />}
            />
          </motion.div>
          {metrics.avgRpe !== null && (
            <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}>
              <SparklineCard
                title="Průměrné RPE"
                value={metrics.avgRpe}
                subtitle="náročnost tréninků"
                data={monthlyTrend}
                variant="warning"
                chartType="line"
                icon={<Flame className="w-4 h-4" />}
              />
            </motion.div>
          )}
        </div>

        {/* Career Stats */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-card/80 backdrop-blur-md border rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Celkem tréninků</p>
              <AnimatedCounter value={metrics.totalTrainings} className="text-2xl sm:text-3xl font-bold text-foreground" />
            </div>
            <div className="bg-card/80 backdrop-blur-md border rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Celkem klientů</p>
              <AnimatedCounter value={metrics.totalClients} className="text-2xl sm:text-3xl font-bold text-foreground" />
            </div>
            <div className="bg-card/80 backdrop-blur-md border rounded-xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Tréninkových hodin</p>
              <AnimatedCounter value={metrics.totalHours} className="text-2xl sm:text-3xl font-bold text-foreground" />
            </div>
          </div>
        </motion.div>

        {/* Top PRs */}
        {topPRs.length > 0 && (
          <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="bg-card/80 backdrop-blur-md border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Top osobní rekordy klientů
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topPRs.map((pr, i) => (
                  <motion.div
                    key={pr.name}
                    custom={9 + i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pr.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-bold">{pr.weight} kg</span>
                        {pr.reps > 0 && ` × ${pr.reps}`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div custom={15} initial="hidden" animate="visible" variants={fadeUp}>
          <p className="text-center text-[10px] text-muted-foreground/50 uppercase tracking-widest pt-4">
            Powered by JustMove Asistent
          </p>
        </motion.div>
      </div>
    </div>
  );
}
