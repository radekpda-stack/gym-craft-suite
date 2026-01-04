import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAttendanceStats, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientComprehensiveAttendanceStats } from '@/hooks/useClientComprehensiveAttendanceStats';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Calendar, CheckCircle2, Clock, Dumbbell, AlertCircle, Flame, TrendingUp, Trophy, CalendarDays, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PeriodChips, TrendIcon } from '@/components/client-portal/common/SharedComponents';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

export default function ClientPortalAttendance() {
  const { clientId } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  
  const { data: stats, isLoading, error } = useClientAttendanceStats(clientId ?? undefined, period);
  const { stats: comprehensiveStats, isLoading: isLoadingComprehensive } = useClientComprehensiveAttendanceStats(clientId ?? undefined);
  const { trackPageMount, trackPortalEvent } = useClientPortalPageTracking('client_portal_attendance');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  useEffect(() => {
    if (stats && stats.trainingsInPeriod > 0) {
      trackPortalEvent('client_portal_view_sessions', { 
        sessions_count: stats.trainingsInPeriod,
        period 
      });
    }
  }, [stats, period, trackPortalEvent]);

  const isAnyLoading = isLoading || isLoadingComprehensive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Docházka</h1>
          <p className="text-muted-foreground text-sm">Historie absolvovaných tréninků</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nepodařilo se načíst docházku. Zkus to prosím znovu.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-6">
            {isAnyLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            ) : comprehensiveStats ? (
              <div className="text-center">
                <motion.p 
                  className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                >
                  {comprehensiveStats.totalTrainings}
                </motion.p>
                <p className="text-lg text-muted-foreground mt-1">
                  absolvovaných tréninků
                </p>
                {comprehensiveStats.firstTrainingDate && (
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    od {format(comprehensiveStats.firstTrainingDate, 'd. MMMM yyyy', { locale: cs })}
                    {' • '}
                    <span className="font-medium text-foreground/70">
                      {comprehensiveStats.monthsWithTrainer} {comprehensiveStats.monthsWithTrainer === 1 ? 'měsíc' : comprehensiveStats.monthsWithTrainer < 5 ? 'měsíce' : 'měsíců'} s trenérem
                    </span>
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isAnyLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : comprehensiveStats ? (
          <>
            {/* Week Streak */}
            <Card className={cn(
              "transition-all",
              comprehensiveStats.currentWeekStreak >= 4 && "border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Flame className={cn(
                    "w-4 h-4",
                    comprehensiveStats.currentWeekStreak >= 4 && "text-orange-500"
                  )} />
                  <span className="text-xs font-medium">Týdenní streak</span>
                </div>
                <p className={cn(
                  "text-2xl font-bold",
                  comprehensiveStats.currentWeekStreak >= 4 && "text-orange-500"
                )}>
                  {comprehensiveStats.currentWeekStreak}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comprehensiveStats.currentWeekStreak === 1 ? 'týden' : comprehensiveStats.currentWeekStreak < 5 ? 'týdny' : 'týdnů'} v řadě
                </p>
              </CardContent>
            </Card>

            {/* Average per Month */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">Průměr / měsíc</span>
                </div>
                <p className="text-2xl font-bold">{comprehensiveStats.averagePerMonth}</p>
                <p className="text-xs text-muted-foreground">tréninků měsíčně</p>
              </CardContent>
            </Card>

            {/* Best Month */}
            <Card className={cn(
              comprehensiveStats.bestMonth && "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className={cn(
                    "w-4 h-4",
                    comprehensiveStats.bestMonth && "text-yellow-500"
                  )} />
                  <span className="text-xs font-medium">Nejlepší měsíc</span>
                </div>
                {comprehensiveStats.bestMonth ? (
                  <>
                    <p className="text-lg font-bold capitalize truncate">
                      {comprehensiveStats.bestMonth.month}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comprehensiveStats.bestMonth.count} tréninků
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>

            {/* This Year */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-xs font-medium">Tento rok</span>
                </div>
                <p className="text-2xl font-bold">{comprehensiveStats.thisYear}</p>
                <p className="text-xs text-muted-foreground">
                  {comprehensiveStats.lastYear > 0 ? (
                    <>loni: {comprehensiveStats.lastYear}</>
                  ) : (
                    `tréninků v ${new Date().getFullYear()}`
                  )}
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </motion.div>

      {/* Milestones */}
      {comprehensiveStats && comprehensiveStats.totalTrainings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                Milníky
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress to next milestone */}
              {comprehensiveStats.nextMilestone && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Další cíl: <span className="font-medium text-foreground">{comprehensiveStats.nextMilestone} tréninků</span>
                    </span>
                    <span className="text-muted-foreground">
                      {comprehensiveStats.nextMilestone - comprehensiveStats.totalTrainings} zbývá
                    </span>
                  </div>
                  <Progress value={comprehensiveStats.progressToNextMilestone} className="h-2" />
                </div>
              )}

              {/* Milestone badges */}
              <TooltipProvider>
                <div className="flex flex-wrap gap-2">
                  {comprehensiveStats.milestones
                    .filter(m => m.value <= Math.max(comprehensiveStats.totalTrainings * 2, 100))
                    .map((milestone) => (
                      <Tooltip key={milestone.value}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-default",
                              milestone.reached
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-muted text-muted-foreground border border-border"
                            )}
                          >
                            {milestone.reached && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                            {milestone.value}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {milestone.reached && milestone.reachedAt ? (
                            <p>Dosaženo {format(milestone.reachedAt, 'd. MMMM yyyy', { locale: cs })}</p>
                          ) : (
                            <p>Zbývá {milestone.value - comprehensiveStats.totalTrainings} tréninků</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Period Selector & Sessions List */}
      <div className="flex justify-end">
        <PeriodChips value={period} onChange={setPeriod} options={periodOptions} />
      </div>

      {/* Summary for selected period */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20">
          <CardContent className="p-5">
            {isLoading ? (
              <div className="flex gap-6">
                <Skeleton className="h-16 w-32" />
                <Skeleton className="h-16 w-32" />
              </div>
            ) : stats ? (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-3xl font-bold">{stats.trainingsInPeriod}</p>
                  <p className="text-sm text-muted-foreground">
                    za {period === 'all' ? 'celou historii' : `${period} dní`}
                  </p>
                </div>
                
                <div className="border-l border-border/50 pl-6">
                  <p className="text-xl font-bold">{stats.avgPerWeek}</p>
                  <p className="text-sm text-muted-foreground">průměr / týden</p>
                </div>

                {period !== 'all' && (
                  <div className="border-l border-border/50 pl-6">
                    <div className="flex items-center gap-2">
                      <TrendIcon value={stats.trend} />
                      <p className="text-lg font-medium">
                        {stats.trend > 0 ? '+' : ''}{stats.trend}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">oproti minulému období</p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sessions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Historie tréninků
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !stats || stats.sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Zatím tu nejsou žádné absolvované tréninky</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Po absolvování tréninku se zde objeví tvá docházka
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {format(parseISO(session.date), 'EEEE d. MMMM', { locale: cs })}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {session.training_type && (
                          <>
                            <span>{session.training_type}</span>
                            <span className="text-muted-foreground/50">•</span>
                          </>
                        )}
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.duration} min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-success/10 text-success">
                        Absolvováno
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
