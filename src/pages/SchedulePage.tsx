import { useState, useMemo } from 'react';
import { addDays, subDays, isSameDay, format, startOfWeek, endOfWeek } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, List, Calendar as CalendarIcon } from 'lucide-react';
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
import { CalendarDatePicker } from '@/components/calendar/CalendarDatePicker';
import { EmptyAgendaState } from '@/components/calendar/EmptyAgendaState';
import { QuickPaymentDialog } from '@/components/calendar/QuickPaymentDialog';
import { FreeSlotIndicator } from '@/components/calendar/FreeSlotIndicator';
import { CancelTrainingDialog } from '@/components/trainings/CancelTrainingDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    if (eventStart - currentTime >= 60 * 60000) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(eventStart)
      });
    }
    currentTime = Math.max(currentTime, event.end.getTime());
  }

  if (dayEnd.getTime() - currentTime >= 60 * 60000) {
    freeSlots.push({
      start: new Date(currentTime),
      end: dayEnd
    });
  }

  return freeSlots;
}

export default function SchedulePage() {
  usePageTracking('schedule');
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
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

  // Week navigation
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get events for current day
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

  // Get events count for each day in week
  const getEventsForDay = (date: Date) => {
    const ownEvents = sessions.filter((session) => 
      isSameDay(new Date(session.date), date) && session.status !== 'canceled'
    );
    const sharedEvents = sharedTrainings.filter((session) => 
      isSameDay(new Date(session.date), date)
    );
    return { own: ownEvents.length, shared: sharedEvents.length, total: ownEvents.length + sharedEvents.length };
  };

  const getClient = (clientId: string) => {
    return clients.find((c) => c.id === clientId);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => (direction === 'next' ? addDays(prev, 7) : subDays(prev, 7)));
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

  const confirmComplete = async () => {
    if (!completeDialog.session) return;
    
    await updateTraining.mutateAsync({
      id: completeDialog.session.id,
      input: { status: 'completed' },
      trainingPrices,
    });
    setCompleteDialog({ open: false, session: null });
  };

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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Rozvrh</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className={cn(
                'rounded-full text-sm',
                isSameDay(currentDate, new Date()) && 'bg-primary/10 text-primary'
              )}
            >
              Dnes
            </Button>
            <CalendarDatePicker date={currentDate} onDateSelect={setCurrentDate} />
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateWeek('prev')}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            {format(weekStart, 'd. MMM', { locale: cs })} - {format(addDays(weekStart, 6), 'd. MMM yyyy', { locale: cs })}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigateWeek('next')}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="px-4 py-3 border-b border-border/30">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const { own, shared, total } = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, currentDate);
            const isFreeDay = total === 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setCurrentDate(day)}
                className={cn(
                  'flex flex-col items-center p-2 rounded-xl transition-all touch-target relative',
                  isSelected && 'ring-2 ring-primary bg-primary/10',
                  isToday && !isSelected && 'ring-1 ring-primary/50',
                  !isSelected && !isToday && 'hover:bg-secondary/50'
                )}
              >
                <span className="text-[10px] uppercase font-medium text-muted-foreground">
                  {format(day, 'EEE', { locale: cs })}
                </span>
                <span className={cn(
                  'text-lg font-bold mt-0.5',
                  isToday ? 'text-primary' : 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                
                {/* Indicator dots or count */}
                <div className="flex items-center gap-0.5 mt-1 h-4">
                  {isFreeDay ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : total <= 3 ? (
                    // Show dots for 1-3 trainings
                    Array.from({ length: Math.min(total, 3) }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          i < own ? 'bg-primary' : 'bg-muted-foreground/40'
                        )} 
                      />
                    ))
                  ) : (
                    // Show count for 4+ trainings
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      total >= 5 ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                    )}>
                      {own}{shared > 0 && <span className="text-muted-foreground">+{shared}</span>}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground capitalize">
              {format(currentDate, 'EEEE', { locale: cs })}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(currentDate, 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
          <div className="text-right">
            {hasAnyEvents ? (
              <>
                <p className="text-foreground font-medium">
                  {dayEvents.filter(e => e.status !== 'canceled').length} tréninků
                </p>
                {freeSlots.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {freeSlots.length} volných bloků
                  </p>
                )}
              </>
            ) : (
              <span className="text-sm font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                Volný den
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Day Events List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
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
            {/* Morning free slot */}
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

            {/* Free slots between and after trainings */}
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
      </div>

      {/* Create Training Sheet */}
      <CreateTrainingSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
        defaultValues={selectedDateTime ? { date: selectedDateTime } : undefined}
      />

      {/* Complete Dialog */}
      <AlertDialog open={completeDialog.open} onOpenChange={(open) => setCompleteDialog({ open, session: open ? completeDialog.session : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokončit trénink?</AlertDialogTitle>
            <AlertDialogDescription>
              Trénink bude označen jako dokončený a klientovi bude stržen kredit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>Dokončit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Training Dialog */}
      <CancelTrainingDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, session: open ? cancelDialog.session : null })}
        session={cancelDialog.session}
        onConfirm={confirmCancel}
        trainingPrice={getCancelTrainingPrice()}
      />

      {/* Payment Dialog */}
      {paymentDialog.session && (
        <QuickPaymentDialog
          open={paymentDialog.open}
          onOpenChange={(open) => setPaymentDialog({ open, session: open ? paymentDialog.session : null })}
          trainingId={paymentDialog.session.id}
          clientName={getClient(paymentDialog.session.client_id)?.name || 'Klient'}
          currentPaymentStatus={paymentDialog.session.payment_status || 'pending'}
        />
      )}
    </div>
  );
}
