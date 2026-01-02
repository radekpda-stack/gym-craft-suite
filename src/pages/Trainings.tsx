import { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, Wallet, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/hooks/useClients';
import {
  useTrainingSessions,
  useCreateTrainingSession,
  useUpdateTrainingSession,
  useCancelTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useAddTrainingSessionTags, useAllTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { useAddTrainingSessionParticipants } from '@/hooks/useTrainingSessionParticipants';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { CompactTrainingRow } from '@/components/trainings/CompactTrainingRow';
import { TrainingDayGroup } from '@/components/trainings/TrainingDayGroup';
import { TimeFilterToggle } from '@/components/trainings/TimeFilterToggle';
import { CancelTrainingDialog } from '@/components/trainings/CancelTrainingDialog';
import { TrainingListSkeleton } from '@/components/skeletons';
import { QuickPaymentDialog } from '@/components/calendar/QuickPaymentDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingActionButton, FABAction } from '@/components/ui/floating-action-button';
import { HorizontalChipScroller } from '@/components/ui/HorizontalChipScroller';
import { toast } from '@/hooks/use-toast';
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval, format, parseISO } from 'date-fns';
import { useTrainingsPageState, TimeFilter } from '@/hooks/useTrainingsPageState';

type StatusFilter = 'all' | 'scheduled' | 'completed' | 'canceled' | 'awaiting_payment';

export default function Trainings() {
  usePageTracking('trainings');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [duplicateDefaults, setDuplicateDefaults] = useState<Partial<TrainingFormValues> | undefined>(undefined);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; trainingId: string; clientName: string } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; session: typeof sessions[0] | null }>({ open: false, session: null });

  // Persistent page state
  const { timeFilter, statusFilter, setTimeFilter, setStatusFilter } = useTrainingsPageState();

  // FAB Actions - Only on mobile
  const fabActions: FABAction[] = [
    {
      id: 'new-training',
      icon: <Dumbbell className="h-5 w-5" />,
      label: 'Nový trénink',
      onClick: () => setIsCreateSheetOpen(true),
      variant: 'primary',
    },
    {
      id: 'quick-sale',
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Rychlý prodej',
      onClick: () => navigate('/sales?action=quick-sale'),
      variant: 'default',
    },
    {
      id: 'top-up-credit',
      icon: <Wallet className="h-5 w-5" />,
      label: 'Dobít kredit',
      onClick: () => navigate('/clients?action=top-up'),
      variant: 'success',
    },
  ];

  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const createTraining = useCreateTrainingSession();
  const updateTraining = useUpdateTrainingSession();
  const cancelTraining = useCancelTrainingSession();
  const trainingPrices = useTrainingPrices();
  const addTrainingTags = useAddTrainingSessionTags();
  const addTrainingParticipants = useAddTrainingSessionParticipants();
  const { data: sessionTagsMap = {} } = useAllTrainingSessionTags();

  // Filter sessions by time period
  const filterByTime = (sessionList: typeof sessions, filter: TimeFilter) => {
    const now = new Date();
    
    if (filter === 'today') {
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      return sessionList.filter(s => {
        const sessionDate = new Date(s.date);
        return isWithinInterval(sessionDate, { start: todayStart, end: todayEnd });
      });
    }
    
    if (filter === 'week') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return sessionList.filter(s => {
        const sessionDate = new Date(s.date);
        return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      });
    }
    
    return sessionList;
  };

  // Time-filtered counts
  const timeCounts = useMemo(() => {
    const active = sessions.filter(s => s.status !== 'canceled');
    return {
      today: filterByTime(active, 'today').length,
      week: filterByTime(active, 'week').length,
      all: active.length,
    };
  }, [sessions]);

  // Apply time filter
  const timeFilteredSessions = useMemo(() => {
    return filterByTime(sessions, timeFilter);
  }, [sessions, timeFilter]);

  // Status counts for chips
  const statusCounts = useMemo(() => {
    const filtered = timeFilteredSessions;
    return {
      all: filtered.length,
      scheduled: filtered.filter(s => s.status === 'scheduled').length,
      completed: filtered.filter(s => s.status === 'completed').length,
      canceled: filtered.filter(s => s.status === 'canceled').length,
      awaiting_payment: filtered.filter(s => s.status === 'completed' && (!s.payment_status || s.payment_status === 'pending')).length,
    };
  }, [timeFilteredSessions]);

  const handleCompleteTraining = async (sessionId: string) => {
    try {
      await updateTraining.mutateAsync({
        id: sessionId,
        input: { status: 'completed' },
        trainingPrices,
      });
      toast({ title: 'Trénink dokončen' });
    } catch (error) {
      toast({ title: 'Chyba při dokončování', variant: 'destructive' });
    }
  };

  const handleStartTraining = async (sessionId: string) => {
    try {
      await updateTraining.mutateAsync({
        id: sessionId,
        input: { status: 'in_progress' },
        trainingPrices,
      });
      toast({ title: 'Trénink zahájen' });
    } catch (error) {
      toast({ title: 'Chyba při zahajování', variant: 'destructive' });
    }
  };

  const handleOpenCancelDialog = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCancelDialog({ open: true, session });
    }
  };

  const handleConfirmCancel = async (deductCredit: boolean) => {
    if (!cancelDialog.session) return;
    
    try {
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
      toast({ 
        title: deductCredit ? 'Trénink zrušen (kredit stržen)' : 'Trénink zrušen',
        variant: isLateCancellation ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({ title: 'Chyba při rušení', variant: 'destructive' });
    }
  };

  const getCancelTrainingPrice = () => {
    if (!cancelDialog.session) return 0;
    const participantCount = cancelDialog.session.participant_count || 1;
    return trainingPrices[String(participantCount) as keyof typeof trainingPrices] || trainingPrices['1'] || 800;
  };

  const handleDuplicateTraining = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const originalDate = new Date(session.date);
    const nextDate = addDays(new Date(), 1);
    nextDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
    
    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');
    const hours = String(nextDate.getHours()).padStart(2, '0');
    const minutes = String(nextDate.getMinutes()).padStart(2, '0');

    setDuplicateDefaults({
      client_id: session.client_id,
      date: `${year}-${month}-${day}T${hours}:${minutes}`,
      duration: session.duration,
      participant_count: session.participant_count || 1,
      notes: session.notes || '',
      status: 'scheduled',
    });
    setIsCreateSheetOpen(true);
  };

  const handleOpenPayment = (sessionId: string, clientName: string) => {
    setPaymentDialog({
      open: true,
      trainingId: sessionId,
      clientName,
    });
  };

  // Apply status filter
  const filteredSessions = useMemo(() => {
    return timeFilteredSessions.filter((session) => {
      const client = clients.find((c) => c.id === session.client_id);
      const matchesSearch =
        client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (statusFilter === 'all' || !statusFilter) {
        return matchesSearch;
      }

      if (statusFilter === 'awaiting_payment') {
        return matchesSearch && 
          session.status === 'completed' && 
          (!session.payment_status || session.payment_status === 'pending');
      }

      return matchesSearch && session.status === statusFilter;
    });
  }, [timeFilteredSessions, clients, searchQuery, statusFilter]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Record<string, typeof filteredSessions> = {};
    
    filteredSessions.forEach((session) => {
      const dateKey = format(parseISO(session.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    // Sort groups by date and sessions within each group by time
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map((dateKey) => ({
      date: dateKey,
      sessions: groups[dateKey].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    }));
  }, [filteredSessions]);

  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    try {
      let recurrence_end_date: string | undefined;
      let recurrence_type: 'weekly' | 'biweekly' | 'monthly' | undefined;
      
      if (data.is_recurring && data.recurrence_type && data.recurrence_count) {
        const startDate = new Date(data.date);
        const count = data.recurrence_count;
        recurrence_type = data.recurrence_type;
        
        const endDate = new Date(startDate);
        switch (data.recurrence_type) {
          case 'weekly':
            endDate.setDate(endDate.getDate() + (count * 7));
            break;
          case 'biweekly':
            endDate.setDate(endDate.getDate() + (count * 14));
            break;
          case 'monthly':
            endDate.setMonth(endDate.getMonth() + count);
            break;
        }
        recurrence_end_date = endDate.toISOString();
      }
      
      const result = await createTraining.mutateAsync({
        client_id: data.client_id,
        date: new Date(data.date).toISOString(),
        duration: data.duration,
        notes: data.notes,
        status: data.status,
        participant_count: data.participant_count,
        recurrence_type,
        recurrence_end_date,
        trainingPrices,
      });
      
      if (result?.session?.id) {
        // Save tags if any
        if (tagIds.length > 0) {
          await addTrainingTags.mutateAsync({
            trainingSessionId: result.session.id,
            tagIds,
          });
        }
        
        // Save additional participants if any
        const additionalClientIds = data.additional_client_ids || [];
        if (additionalClientIds.length > 0) {
          await addTrainingParticipants.mutateAsync({
            trainingSessionId: result.session.id,
            clientIds: additionalClientIds,
          });
        }
      }
      
      setIsCreateSheetOpen(false);
      setDuplicateDefaults(undefined);
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };

  const handleSheetClose = (open: boolean) => {
    setIsCreateSheetOpen(open);
    if (!open) {
      setDuplicateDefaults(undefined);
    }
  };

  // Status chip options
  const statusChipOptions = [
    { value: 'all', label: 'Všechny', count: statusCounts.all },
    { value: 'scheduled', label: 'Plán', count: statusCounts.scheduled },
    { value: 'completed', label: 'Hotovo', count: statusCounts.completed },
    { value: 'awaiting_payment', label: 'Čeká', count: statusCounts.awaiting_payment },
    { value: 'canceled', label: 'Zrušeno', count: statusCounts.canceled },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header - No top-right button on desktop, FAB handles mobile */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Tréninky
          </h1>
          <p className="text-sm text-muted-foreground">
            {sessions.length} celkem
          </p>
        </div>

        {/* Desktop only - hidden on mobile where FAB is used */}
        <Button className="gap-2 hidden sm:flex" onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Nový trénink
        </Button>
      </div>

      {/* Time Filter Toggle */}
      <TimeFilterToggle
        value={timeFilter}
        onChange={setTimeFilter}
        counts={timeCounts}
      />

      <CreateTrainingSheet
        key={duplicateDefaults ? 'duplicate' : 'new'}
        open={isCreateSheetOpen}
        onOpenChange={handleSheetClose}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
        defaultValues={duplicateDefaults}
      />

      {/* Search + Status Filter Chips */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-card border-border"
          />
        </div>

        {/* Horizontal Chip Scroller for status */}
        <HorizontalChipScroller
          options={statusChipOptions}
          value={statusFilter || 'all'}
          onChange={(val) => setStatusFilter(val === 'all' ? null : val as any)}
        />
      </div>

      {/* Sessions List - Compact Rows */}
      {isLoading ? (
        <TrainingListSkeleton />
      ) : (
        <div className="space-y-3">
          {groupedSessions.map(({ date, sessions: daySessions }) => (
            <div key={date} className="bg-card rounded-lg border border-border overflow-hidden">
              <TrainingDayGroup date={date}>
                {daySessions.map((session) => {
                  const client = clients.find((c) => c.id === session.client_id);

                  return (
                    <CompactTrainingRow
                      key={session.id}
                      session={session}
                      client={client}
                      onStart={() => handleStartTraining(session.id)}
                      onComplete={() => handleCompleteTraining(session.id)}
                      onCancel={() => handleOpenCancelDialog(session.id)}
                      onDuplicate={() => handleDuplicateTraining(session.id)}
                    />
                  );
                })}
              </TrainingDayGroup>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredSessions.length === 0 && (
        <div className="rounded-lg border border-border p-8">
          <EmptyState
            icon={Dumbbell}
            title={timeFilteredSessions.length === 0 ? "Zatím žádné tréninky" : "Nic nenalezeno"}
            description={timeFilteredSessions.length === 0 ? "Vytvořte první trénink" : "Upravte vyhledávání nebo filtry"}
            size="lg"
            action={timeFilteredSessions.length === 0 ? (
              <Button 
                className="gap-2"
                onClick={() => setIsCreateSheetOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Nový trénink
              </Button>
            ) : undefined}
          />
        </div>
      )}

      {/* Quick Payment Dialog */}
      {paymentDialog && (
        <QuickPaymentDialog
          open={paymentDialog.open}
          onOpenChange={(open) => !open && setPaymentDialog(null)}
          trainingId={paymentDialog.trainingId}
          clientName={paymentDialog.clientName}
          currentPaymentStatus="pending"
        />
      )}

      {/* Cancel Training Dialog */}
      <CancelTrainingDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, session: open ? cancelDialog.session : null })}
        session={cancelDialog.session}
        clientName={cancelDialog.session ? clients.find(c => c.id === cancelDialog.session?.client_id)?.name : undefined}
        trainingPrice={getCancelTrainingPrice()}
        onConfirm={handleConfirmCancel}
        isLoading={cancelTraining.isPending}
      />

      {/* Mobile FAB Menu */}
      <div className="sm:hidden">
        <FloatingActionButton actions={fabActions} />
      </div>
    </div>
  );
}
