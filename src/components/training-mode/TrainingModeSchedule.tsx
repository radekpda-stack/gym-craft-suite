import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { TrainingModeCard } from './TrainingModeCard';
import { PullToRefresh } from './PullToRefresh';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { useDashboardSchedule } from '@/hooks/dashboard/useDashboardSchedule';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';

export function TrainingModeSchedule() {
  const { activeSessionId, setActiveSession } = useTrainingMode();
  const { data: dashboardData, isLoading: dashboardLoading, refetch } = useDashboardSchedule();
  const { data: allSessions = [], isLoading: sessionsLoading } = useTrainingSessions();

  const isLoading = dashboardLoading || sessionsLoading;

  // Get today's sessions with full data
  const todaySessions = useMemo(() => {
    if (!dashboardData?.todaySchedule) return [];
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Match dashboard schedule items with full session data
    return dashboardData.todaySchedule
      .map(scheduleItem => {
        const fullSession = allSessions.find(s => s.id === scheduleItem.id);
        return fullSession ? {
          ...fullSession,
          status: scheduleItem.status as 'scheduled' | 'completed' | 'cancelled' | 'canceled',
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());
  }, [dashboardData, allSessions]);

  const handleToggleActive = (id: string) => {
    setActiveSession(activeSessionId === id ? null : id);
  };

  const handleComplete = () => {
    refetch();
  };

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date();
  const dateStr = format(today, 'EEEE, d. MMMM', { locale: cs });

  // Separate by status
  const scheduledSessions = todaySessions.filter(s => s?.status === 'scheduled');
  const completedSessions = todaySessions.filter(s => s?.status === 'completed');
  const cancelledSessions = todaySessions.filter(s => 
    s?.status === 'cancelled' || s?.status === 'canceled'
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="p-4 space-y-4 pb-32">
        {/* Date header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
              {todaySessions.length} tréninků
            </span>
          </div>
        </div>

        {todaySessions.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-semibold text-lg mb-2">Žádné tréninky</h3>
            <p className="text-sm text-muted-foreground">
              Dnes nemáte naplánované žádné tréninky
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scheduled (active) sessions first */}
            {scheduledSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Naplánované ({scheduledSessions.length})
                </h3>
                <div className="space-y-3">
                  {scheduledSessions.map((session) => session && (
                    <TrainingModeCard
                      key={session.id}
                      session={session}
                      isActive={activeSessionId === session.id}
                      onToggleActive={handleToggleActive}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed sessions */}
            {completedSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  Dokončené ({completedSessions.length})
                </h3>
                <div className="space-y-3">
                  {completedSessions.map((session) => session && (
                    <TrainingModeCard
                      key={session.id}
                      session={session}
                      isActive={activeSessionId === session.id}
                      onToggleActive={handleToggleActive}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled sessions */}
            {cancelledSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  Zrušené ({cancelledSessions.length})
                </h3>
                <div className="space-y-3">
                  {cancelledSessions.map((session) => session && (
                    <TrainingModeCard
                      key={session.id}
                      session={session}
                      isActive={activeSessionId === session.id}
                      onToggleActive={handleToggleActive}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
