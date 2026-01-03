import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAttendanceStats, useClientCreditStats, useClientRecentActivity, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { 
  Wallet, 
  Calendar, 
  ChevronRight,
  Dumbbell,
  ArrowDownLeft,
  CalendarClock,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toVocative } from '@/lib/czechVocative';

// Dashboard widgets
import { ActiveChallengeWidget } from '@/components/client-portal/dashboard/ActiveChallengeWidget';
import { NextTrainingWidget } from '@/components/client-portal/dashboard/NextTrainingWidget';
import { ProgressLinkCard } from '@/components/client-portal/dashboard/ProgressLinkCard';
import { ClientPortalFeedbackSection } from '@/components/client-portal/ClientPortalFeedbackSection';
import { GamificationBadge } from '@/components/client-portal/gamification/GamificationBadge';
import { PeriodChips } from '@/components/client-portal/common/SharedComponents';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 7, label: '7 dní' },
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
];

export default function ClientPortalOverview() {
  const { clientId, clientProfile } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  
  const { data: creditStats, isLoading: creditLoading, error: creditError } = useClientCreditStats(clientId ?? undefined, period);
  const { data: attendanceStats, isLoading: attendanceLoading, error: attendanceError } = useClientAttendanceStats(clientId ?? undefined, period);
  const { data: recentActivity, isLoading: activityLoading } = useClientRecentActivity(clientId ?? undefined, 5);
  
  const { trackPageMount } = useClientPortalPageTracking('client_portal_overview');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const hasError = creditError || attendanceError;

  // Calculate credit trend
  const creditTrend = creditStats?.netChange ?? 0;

  return (
    <div className="space-y-6">
      {/* Header with Gamification Badge */}
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
        
        {/* Gamification Badge - Minimální zobrazení */}
        <GamificationBadge />
      </div>

      {/* Error Alert */}
      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nepodařilo se načíst některá data. Zkus to prosím znovu.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. KREDIT - Hlavní priorita, velká karta */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link to="/client/credit">
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Kredit</p>
                    {creditLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {creditStats?.balance.toLocaleString('cs-CZ') ?? 0} Kč
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Trend za období */}
                  {!creditLoading && creditTrend !== 0 && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      creditTrend > 0 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {creditTrend > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {creditTrend > 0 ? '+' : ''}{creditTrend.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* 2. DOCHÁZKA + PROGRESS - Grid 2 sloupce */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Link to="/client/attendance">
            <Card className="relative overflow-hidden bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20 hover:border-success/40 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tréninky ({period} dní)</p>
                      {attendanceLoading ? (
                        <Skeleton className="h-7 w-16" />
                      ) : (
                        <p className="text-xl font-bold">
                          {attendanceStats?.trainingsInPeriod ?? 0}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Progress Link Card */}
        <ProgressLinkCard delay={0.2} />
      </div>

      {/* 3. DALŠÍ TRÉNINK */}
      <NextTrainingWidget />

      {/* 4. AKTIVNÍ VÝZVY */}
      <ActiveChallengeWidget />

      {/* Feedback Section - shows when feedback is available */}
      <ClientPortalFeedbackSection />

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Poslední aktivita</h3>
              <div className="space-y-2">
                {activityLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
                ) : (
                  recentActivity.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        item.type === 'training' ? "bg-success/10" : 
                        item.type === 'upcoming_training' ? "bg-blue-500/10" : 
                        "bg-success/10"
                      )}>
                        {item.type === 'training' ? (
                          <Dumbbell className="w-4 h-4 text-success" />
                        ) : item.type === 'upcoming_training' ? (
                          <CalendarClock className="w-4 h-4 text-blue-500" />
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
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
