import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientRecentActivity, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  Dumbbell,
  ArrowDownLeft,
  CalendarClock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toVocative } from '@/lib/czechVocative';
import { Button } from '@/components/ui/button';

// Dashboard widgets
import { ActiveChallengeWidget } from '@/components/client-portal/dashboard/ActiveChallengeWidget';
import { ProgressLinkCard } from '@/components/client-portal/dashboard/ProgressLinkCard';
import { OverallPerformanceCard } from '@/components/client-portal/dashboard/OverallPerformanceCard';
import { GamificationBadge } from '@/components/client-portal/gamification/GamificationBadge';
import { DailyCheckinCard } from '@/components/client-portal/gamification/DailyCheckinCard';
import { WeeklyMissionsCard } from '@/components/client-portal/gamification/WeeklyMissionsCard';
import { TrainingCalendar } from '@/components/client-portal/calendar/TrainingCalendar';
import { PeriodChips } from '@/components/client-portal/common/SharedComponents';
import { ClientQuickActions } from '@/components/client-portal/dashboard/ClientQuickActions';
import { ClientActionRequired } from '@/components/client-portal/dashboard/ClientActionRequired';
import { HeroStatsRow } from '@/components/client-portal/dashboard/HeroStatsRow';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
];

export default function ClientPortalOverview() {
  const { clientId, clientProfile } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [activityExpanded, setActivityExpanded] = useState(false);
  
  const { data: recentActivity, isLoading: activityLoading } = useClientRecentActivity(clientId ?? undefined, 5);
  
  const { trackPageMount } = useClientPortalPageTracking('client_portal_overview');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  return (
    <div className="space-y-5">
      {/* 1. Header with Gamification Badge */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              Ahoj, {toVocative(clientProfile?.name?.split(' ')[0] ?? 'Klient')}!
            </h1>
            <p className="text-muted-foreground text-sm">Jak ti to jde</p>
          </div>
          <PeriodChips value={period} onChange={setPeriod} options={periodOptions} />
        </div>
        
        {/* Gamification Badge */}
        <GamificationBadge />
      </div>

      {/* 2. Daily Check-in Card */}
      <DailyCheckinCard />

      {/* 3. ACTION REQUIRED - Hero section for pending tasks */}
      <ClientActionRequired />

      {/* 4. Hero Stats Row - Credit + Next Training */}
      <HeroStatsRow period={period} />

      {/* 5. Quick Actions - 4 main icons */}
      <ClientQuickActions />

      {/* 6. Weekly Missions */}
      <WeeklyMissionsCard />

      {/* 7. Training Calendar */}
      <TrainingCalendar />

      {/* 8. Overall Performance Card */}
      {clientId && <OverallPerformanceCard clientId={clientId} />}

      {/* 9. Active Challenges */}
      <ActiveChallengeWidget />

      {/* 10. Progress Link */}
      <ProgressLinkCard delay={0.25} />

      {/* 8. Recent Activity - Collapsible */}
      {recentActivity && recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                onClick={() => setActivityExpanded(!activityExpanded)}
              >
                <h3 className="text-sm font-medium text-muted-foreground">Poslední aktivita</h3>
                {activityExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              
              <AnimatePresence>
                {activityExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-3">
                      {activityLoading ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
                      ) : (
                        recentActivity.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              item.type === 'training' ? "bg-success/10" : 
                              item.type === 'upcoming_training' ? "bg-primary/10" : 
                              "bg-success/10"
                            )}>
                              {item.type === 'training' ? (
                                <Dumbbell className="w-4 h-4 text-success" />
                              ) : item.type === 'upcoming_training' ? (
                                <CalendarClock className="w-4 h-4 text-primary" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4 text-success" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.type === 'upcoming_training' 
                                  ? format(parseISO(item.date), 'd. MMMM', { locale: cs })
                                  : formatDistanceToNow(parseISO(item.date), { addSuffix: true, locale: cs })
                                }
                              </p>
                            </div>
                            {item.value && (
                              <p className="text-sm font-medium text-success">
                                {item.value}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
