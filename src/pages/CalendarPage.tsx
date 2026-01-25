import { useState, useMemo } from 'react';
import { addDays, subDays, isSameDay, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTrainingSessions, useCreateTrainingSession, useUpdateTrainingSession, useCancelTrainingSession, TrainingSession } from '@/hooks/useTrainingSessions';
import { useClients } from '@/hooks/useClients';
import { useSharedTrainings } from '@/hooks/useSharedTrainings';
import { useExternalCalendarEvents } from '@/hooks/useExternalCalendarEvents';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { useAppSettings } from '@/hooks/useAppSettings';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useAddTrainingSessionParticipants } from '@/hooks/useTrainingSessionParticipants';
import { AgendaItem } from '@/components/calendar/AgendaItem';
import { SharedTrainingBlock } from '@/components/calendar/SharedTrainingBlock';
import { ExternalEventBlock } from '@/components/calendar/ExternalEventBlock';
import { WeekMiniGrid } from '@/components/calendar/WeekMiniGrid';
import { CalendarDatePicker } from '@/components/calendar/CalendarDatePicker';
import { EmptyAgendaState } from '@/components/calendar/EmptyAgendaState';
import { QuickPaymentDialog } from '@/components/calendar/QuickPaymentDialog';
import { CompleteTrainingDialog } from '@/components/trainings/CompleteTrainingDialog';
import { FreeSlotIndicator } from '@/components/calendar/FreeSlotIndicator';
import { CancelTrainingDialog } from '@/components/trainings/CancelTrainingDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';


type ViewMode = 'agenda' | 'week';

// Pomocná funkce pro generování volných slotů mezi tréninky
function generateFreeSlots(
  ownEvents: TrainingSession[],
  sharedEvents: { date: string; duration: number }[],
  date: Date
): { start: Date; end: Date }[] {
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(20, 0, 0, 0);

  const allEvents = [
    ...ownEvents.map(e => ({ start: new Date(e.date), end: new Date(new Date(e.date).getTime() + e.duration * 60000) })),
    ...sharedEvents.map(e => ({ start: new Date(e.date), end: new Date(new Date(e.date).getTime() + e.duration * 60000) }))
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const freeSlots: { start: Date; end: Date }[] = [];
  let currentTime = dayStart.getTime();

  for (const event of allEvents) {
    const eventStart = event.start.getTime();
    // Pokud je mezera větší než 60 minut, přidej volný slot
    if (eventStart - currentTime >= 60 * 60000) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(eventStart)
      });
    }
    currentTime = Math.max(currentTime, event.end.getTime());
  }

  // Mezera po posledním eventu
  if (dayEnd.getTime() - currentTime >= 60 * 60000) {
    freeSlots.push({
      start: new Date(currentTime),
      end: dayEnd
    });
  }

  return freeSlots;
}

export default function CalendarPage() {
  usePageTracking('calendar');
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<string | null>(null);
  
  // Action dialogs
  const [completeDialog, setCompleteDialog] = useState<{ open: boolean; session: any | null }>({ open: false, session: null });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; session: any | null }>({ open: false, session: null });
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; session: any | null }>({ open: false, session: null });

  const { data: sessions = [], isLoading: sessionsLoading } = useTrainingSessions();
  const { data: sharedTrainings = [] } = useSharedTrainings();
  const { data: externalEvents = [] } = useExternalCalendarEvents();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const createTraining = useCreateTrainingSession();
  const updateTraining = useUpdateTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const addTrainingParticipants = useAddTrainingSessionParticipants();
  const { data: settings } = useAppSettings();
  const trainingPrices = settings?.training_prices || { '1': 800, '2': 1000, '3': 1200 };

  // Get events for current day (agenda view)
  const dayEvents = useMemo(() => {
    return sessions
      .filter((session) => isSameDay(new Date(session.date), currentDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, currentDate]);

  // Sdílené tréninky pro aktuální den
  const daySharedEvents = useMemo(() => {
    return sharedTrainings
      .filter((session) => isSameDay(new Date(session.date), currentDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sharedTrainings, currentDate]);

  // Externí události pro aktuální den
  const dayExternalEvents = useMemo(() => {
    return externalEvents
      .filter((event) => isSameDay(new Date(event.start_time), currentDate))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [externalEvents, currentDate]);

  // Všechny eventy sloučené a seřazené
  const allDayEvents = useMemo(() => {
    const own = dayEvents.map(e => ({ ...e, type: 'own' as const, sortTime: new Date(e.date).getTime() }));
    const shared = daySharedEvents.map(e => ({ ...e, type: 'shared' as const, sortTime: new Date(e.date).getTime() }));
    const external = dayExternalEvents.map(e => ({ ...e, type: 'external' as const, sortTime: new Date(e.start_time).getTime() }));
    return [...own, ...shared, ...external].sort((a, b) => a.sortTime - b.sortTime);
  }, [dayEvents, daySharedEvents, dayExternalEvents]);

  // Volné sloty
  const freeSlots = useMemo(() => {
    return generateFreeSlots(dayEvents.filter(e => e.status !== 'canceled'), daySharedEvents, currentDate);
  }, [dayEvents, daySharedEvents, currentDate]);

  const getClient = (clientId: string) => {
    return clients.find((c) => c.id === clientId);
  };

  const navigate_date = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => (direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateTraining = async (data: TrainingFormValues) => {
    const result = await createTraining.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      duration: data.duration,
      participant_count: data.participant_count,
      notes: data.notes,
      status: data.status,
      trainingPrices,
    });
    
    // Save additional participants if any
    const additionalClientIds = data.additional_client_ids || [];
    if (additionalClientIds.length > 0 && result?.session?.id) {
      await addTrainingParticipants.mutateAsync({
        trainingSessionId: result.session.id,
        clientIds: additionalClientIds,
      });
    }
    
    setIsCreateOpen(false);
    setSelectedDateTime(null);
  };

  const handleOpenCreate = (dateTime?: string) => {
    if (dateTime) {
      setSelectedDateTime(dateTime);
    } else {
      // Pre-fill with current date and next available hour
      const now = new Date();
      const dateToUse = isSameDay(currentDate, now) ? now : currentDate;
      const nextHour = new Date(dateToUse);
      nextHour.setMinutes(0, 0, 0);
      if (isSameDay(currentDate, now)) {
        nextHour.setHours(nextHour.getHours() + 1);
      } else {
        nextHour.setHours(9, 0, 0, 0);
      }
      
      const year = nextHour.getFullYear();
      const month = String(nextHour.getMonth() + 1).padStart(2, '0');
      const day = String(nextHour.getDate()).padStart(2, '0');
      const hours = String(nextHour.getHours()).padStart(2, '0');
      
      setSelectedDateTime(`${year}-${month}-${day}T${hours}:00`);
    }
    setIsCreateOpen(true);
  };

  const handleFreeSlotClick = (slot: { start: Date; end: Date }) => {
    const year = slot.start.getFullYear();
    const month = String(slot.start.getMonth() + 1).padStart(2, '0');
    const day = String(slot.start.getDate()).padStart(2, '0');
    const hours = String(slot.start.getHours()).padStart(2, '0');
    const minutes = String(slot.start.getMinutes()).padStart(2, '0');
    handleOpenCreate(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  // Quick actions
  const handleComplete = (session: any) => {
    setCompleteDialog({ open: true, session });
  };

  // confirmComplete is now handled by CompleteTrainingDialog

  const handleCancel = (session: any) => {
    setCancelDialog({ open: true, session });
  };

  const confirmCancel = async (deductCredit: boolean) => {
    if (!cancelDialog.session) return;
    
    const sessionDate = new Date(cancelDialog.session.date);
    const hoursUntilSession = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilSession < 24;
    
    await cancelTraining.mutateAsync({
      id: cancelDialog.session.id,
      client_id: cancelDialog.session.client_id,
      participant_count: cancelDialog.session.participant_count || 1,
      isLateCancellation,
      trainingPrices,
      deductCredit,
    });
    setCancelDialog({ open: false, session: null });
  };
  
  const getCancelTrainingPrice = () => {
    if (!cancelDialog.session) return 0;
    const participantCount = cancelDialog.session.participant_count || 1;
    return trainingPrices[String(participantCount) as keyof typeof trainingPrices] || trainingPrices['1'] || 800;
  };

  const handlePayment = (session: any) => {
    setPaymentDialog({ open: true, session });
  };

  const handleProgress = (session: any) => {
    navigate(`/records?tab=progress&client=${session.client_id}`);
  };

  const handleNote = (session: any) => {
    navigate(`/trainings/${session.id}`);
  };

  const isLoading = sessionsLoading || clientsLoading;
  const hasAnyEvents = allDayEvents.length > 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Compact Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Kalendář</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/training-mode')}
              className="h-8 px-2.5 rounded-lg bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all"
            >
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground/80 ml-1.5 hidden sm:inline">Tréninkový režim</span>
            </Button>
            <CalendarDatePicker date={currentDate} onDateSelect={setCurrentDate} />
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all touch-target',
              isSameDay(currentDate, new Date())
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            Dnes
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all touch-target',
              viewMode === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            Týden
          </button>
          
          <div className="flex-1" />
          
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate_date('prev')}
              className="h-9 w-9 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate_date('next')}
              className="h-9 w-9 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Week Mini Grid (when week view selected) */}
      {viewMode === 'week' && (
        <div className="px-4 py-3 border-b border-border/30">
          <WeekMiniGrid 
            currentDate={currentDate} 
            sessions={sessions} 
            sharedSessions={sharedTrainings}
            onDaySelect={(date) => {
              setCurrentDate(date);
              // Zachováváme viewMode na 'week' - neměníme na 'agenda'
            }} 
          />
        </div>
      )}

      {/* Date header - zobrazuje se vždy */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground capitalize">
              {format(currentDate, 'EEEE', { locale: cs })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
          {/* Denní souhrn */}
          {hasAnyEvents && (
            <div className="text-right text-sm">
              <p className="text-foreground font-medium">{dayEvents.filter(e => e.status !== 'canceled').length} tréninků</p>
              {(daySharedEvents.length > 0 || dayExternalEvents.length > 0) && (
                <p className="text-muted-foreground">
                  {daySharedEvents.length > 0 && `+${daySharedEvents.length} obsazeno`}
                  {daySharedEvents.length > 0 && dayExternalEvents.length > 0 && ', '}
                  {dayExternalEvents.length > 0 && `${dayExternalEvents.length} ext.`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agenda List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : !hasAnyEvents ? (
          <EmptyAgendaState date={currentDate} onAddTraining={() => handleOpenCreate()} />
        ) : (
          <div className="space-y-2">
            {/* Ranní volný slot */}
            {freeSlots[0] && freeSlots[0].start.getHours() === 8 && (
              <FreeSlotIndicator
                startTime={freeSlots[0].start}
                endTime={freeSlots[0].end}
                onClick={() => handleFreeSlotClick(freeSlots[0])}
              />
            )}

            {allDayEvents.map((event) => {
              if (event.type === 'shared') {
                return <SharedTrainingBlock key={`shared-${event.id}`} training={event as any} />;
              }
              if (event.type === 'external') {
                return <ExternalEventBlock key={`ext-${event.id}`} event={event as any} />;
              }
              return (
                <AgendaItem
                  key={event.id}
                  session={event as any}
                  client={getClient((event as any).client_id)}
                  onComplete={handleComplete}
                  onPayment={handlePayment}
                  onCancel={handleCancel}
                  onProgress={handleProgress}
                  onNote={handleNote}
                />
              );
            })}

            {/* Volné sloty mezi tréninky a po nich */}
            {freeSlots.slice(freeSlots[0]?.start.getHours() === 8 ? 1 : 0).map((slot, i) => (
              <FreeSlotIndicator
                key={`slot-${i}`}
                startTime={slot.start}
                endTime={slot.end}
                onClick={() => handleFreeSlotClick(slot)}
                compact
              />
            ))}
          </div>
        )}

        {/* Trainer legend for shared calendars */}
        {daySharedEvents.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Trenéři:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Map(daySharedEvents.map(e => [e.trainer?.id, e.trainer])).values())
                .filter(Boolean)
                .map((trainer) => (
                  <div 
                    key={trainer?.id} 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${trainer?.color}15`,
                      color: trainer?.color 
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: trainer?.color }}
                    />
                    <span className="font-medium">
                      {trainer?.display_name || trainer?.email?.split('@')[0]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Legend (mobile-friendly) */}
        {hasAnyEvents && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Gesta:</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>→ Dokončit</span>
              <span>← Menu</span>
              <span>Dlouhý stisk = Menu</span>
            </div>
          </div>
        )}
      </div>

      {/* FAB - Add Training */}
      <Button
        size="lg"
        className="fixed right-4 sm:right-6 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[60] h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center p-0"
        onClick={() => handleOpenCreate()}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Create Training Sheet */}
      <CreateTrainingSheet
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setSelectedDateTime(null);
        }}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
        defaultDate={selectedDateTime || undefined}
      />

      {/* Complete Training Dialog - with participant payments */}
      <CompleteTrainingDialog
        open={completeDialog.open}
        onOpenChange={(open) => setCompleteDialog({ open, session: open ? completeDialog.session : null })}
        session={completeDialog.session}
      />

      {/* Cancel Dialog */}
      <CancelTrainingDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, session: open ? cancelDialog.session : null })}
        session={cancelDialog.session}
        clientName={cancelDialog.session ? getClient(cancelDialog.session.client_id)?.name : undefined}
        trainingPrice={getCancelTrainingPrice()}
        onConfirm={confirmCancel}
        isLoading={cancelTraining.isPending}
      />

      {/* Payment Dialog */}
      {paymentDialog.session && (
        <QuickPaymentDialog
          open={paymentDialog.open}
          onOpenChange={(open) => setPaymentDialog({ open, session: open ? paymentDialog.session : null })}
          trainingId={paymentDialog.session.id}
          clientName={getClient(paymentDialog.session.client_id)?.name || 'klient'}
          currentPaymentStatus={paymentDialog.session.payment_status}
        />
      )}
    </div>
  );
}
