import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientAttendanceStats, type PeriodDays } from '@/hooks/useClientPortalStats';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { Calendar, CheckCircle2, Clock, Dumbbell, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const periodOptions: { value: PeriodDays; label: string }[] = [
  { value: 30, label: '30 dní' },
  { value: 90, label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

function PeriodChips({ value, onChange }: { value: PeriodDays; onChange: (v: PeriodDays) => void }) {
  return (
    <div className="flex gap-2">
      {periodOptions.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
  if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function ClientPortalAttendance() {
  const { clientId } = useClientPortal();
  const [period, setPeriod] = useState<PeriodDays>(30);
  
  const { data: stats, isLoading, error } = useClientAttendanceStats(clientId ?? undefined, period);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Docházka</h1>
          <p className="text-muted-foreground text-sm">Historie absolvovaných tréninků</p>
        </div>
        <PeriodChips value={period} onChange={setPeriod} />
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

      {/* Summary Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
                  <p className="text-4xl font-bold">{stats.trainingsInPeriod}</p>
                  <p className="text-sm text-muted-foreground">
                    tréninků za {period === 'all' ? 'celou historii' : `${period} dní`}
                  </p>
                </div>
                
                <div className="border-l border-border/50 pl-6">
                  <p className="text-2xl font-bold">{stats.avgPerWeek}</p>
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
        transition={{ delay: 0.1 }}
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
