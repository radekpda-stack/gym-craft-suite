import { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, Wallet } from 'lucide-react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useClients } from '@/hooks/useClients';
import {
  useTrainingSessions,
  useCreateTrainingSession,
  useUpdateTrainingSession,
} from '@/hooks/useTrainingSessions';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useAddTrainingSessionTags } from '@/hooks/useTrainingSessionTags';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { TrainingQuickMenu } from '@/components/trainings/TrainingQuickMenu';
import { SessionCard } from '@/components/ui/session-card';
import { TrainingListSkeleton } from '@/components/skeletons';
import { QuickPaymentDialog } from '@/components/calendar/QuickPaymentDialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { addDays, format } from 'date-fns';

const statusLabels = {
  scheduled: 'Plán',
  completed: 'Hotovo',
  canceled: 'Zrušeno',
  awaiting_payment: 'Čeká',
};

const statusLabelsLong = {
  scheduled: 'Naplánováno',
  completed: 'Dokončeno',
  canceled: 'Zrušeno',
  awaiting_payment: 'Čeká na platbu',
};

export default function Trainings() {
  usePageTracking('trainings');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [duplicateDefaults, setDuplicateDefaults] = useState<Partial<TrainingFormValues> | undefined>(undefined);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; trainingId: string; clientName: string } | null>(null);

  const { data: clients = [] } = useClients();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const createTraining = useCreateTrainingSession();
  const updateTraining = useUpdateTrainingSession();
  const trainingPrices = useTrainingPrices();
  const addTrainingTags = useAddTrainingSessionTags();

  // Count of trainings awaiting payment (completed but unpaid)
  const awaitingPaymentCount = useMemo(() => {
    return sessions.filter(
      s => s.status === 'completed' && (!s.payment_status || s.payment_status === 'pending')
    ).length;
  }, [sessions]);

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

  const handleCancelTraining = async (sessionId: string) => {
    try {
      const now = new Date();
      const session = sessions.find(s => s.id === sessionId);
      const sessionDate = session ? new Date(session.date) : now;
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isLateCancellation = hoursUntilSession < 24;

      await updateTraining.mutateAsync({
        id: sessionId,
        input: {
          status: 'canceled',
          canceled_at: now.toISOString(),
          is_late_cancellation: isLateCancellation,
        },
        trainingPrices,
      });
      toast({ 
        title: isLateCancellation ? 'Trénink zrušen (pozdě)' : 'Trénink zrušen',
        variant: isLateCancellation ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({ title: 'Chyba při rušení', variant: 'destructive' });
    }
  };

  const handleDuplicateTraining = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Get next available time (tomorrow at same hour)
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

  const filteredSessions = sessions.filter((session) => {
    const client = clients.find((c) => c.id === session.client_id);
    const matchesSearch =
      client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Special filter for awaiting payment
    if (statusFilter === 'awaiting_payment') {
      return matchesSearch && 
        session.status === 'completed' && 
        (!session.payment_status || session.payment_status === 'pending');
    }

    const matchesStatus = !statusFilter || session.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    try {
      // Calculate recurrence end date if recurring
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
        subjective_rating: data.subjective_rating || undefined,
        status: data.status,
        participant_count: data.participant_count,
        recurrence_type,
        recurrence_end_date,
        trainingPrices,
      });
      
      // Add tags to the created training
      if (tagIds.length > 0 && result?.session?.id) {
        await addTrainingTags.mutateAsync({
          trainingSessionId: result.session.id,
          tagIds,
        });
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - Mobile optimized */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Tréninky
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sessions.length} celkem
          </p>
        </div>

        {/* Desktop button */}
        <Button className="gap-2 hidden sm:flex" onClick={() => setIsCreateSheetOpen(true)}>
          <Plus className="w-4 h-4" />
          Nový trénink
        </Button>
      </div>

      <CreateTrainingSheet
        key={duplicateDefaults ? 'duplicate' : 'new'}
        open={isCreateSheetOpen}
        onOpenChange={handleSheetClose}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
        defaultValues={duplicateDefaults}
      />

      {/* Search and Filters - Mobile optimized */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border rounded-xl text-base"
          />
        </div>

        {/* Filter pills - horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <Button
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
            className="rounded-full h-9 px-4 flex-shrink-0 touch-target"
            size="sm"
          >
            Všechny
          </Button>
          {(['scheduled', 'completed', 'canceled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className="rounded-full h-9 px-4 flex-shrink-0 touch-target"
              size="sm"
            >
              <span className="sm:hidden">{statusLabels[status]}</span>
              <span className="hidden sm:inline">{statusLabelsLong[status]}</span>
            </Button>
          ))}
          {/* Awaiting payment filter with badge */}
          <Button
            variant={statusFilter === 'awaiting_payment' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('awaiting_payment')}
            className="rounded-full h-9 px-4 flex-shrink-0 touch-target gap-2"
            size="sm"
          >
            <span className="sm:hidden">{statusLabels.awaiting_payment}</span>
            <span className="hidden sm:inline">{statusLabelsLong.awaiting_payment}</span>
            {awaitingPaymentCount > 0 && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full",
                  statusFilter === 'awaiting_payment' 
                    ? "bg-background/20 text-foreground" 
                    : "bg-warning/20 text-warning"
                )}
              >
                {awaitingPaymentCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <TrainingListSkeleton />
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session, index) => {
            const client = clients.find((c) => c.id === session.client_id);
            const isAwaitingPayment = session.status === 'completed' && 
              (!session.payment_status || session.payment_status === 'pending');

            return (
              <div
                key={session.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
              >
                <TrainingQuickMenu
                  session={session}
                  onComplete={() => handleCompleteTraining(session.id)}
                  onCancel={() => handleCancelTraining(session.id)}
                  onDuplicate={() => handleDuplicateTraining(session.id)}
                >
                  <div className="relative">
                    <SessionCard
                      session={session}
                      client={client}
                    />
                    {/* Quick payment button for awaiting payment filter */}
                    {statusFilter === 'awaiting_payment' && isAwaitingPayment && (
                      <Button
                        size="sm"
                        variant="default"
                        className="absolute right-3 top-1/2 -translate-y-1/2 gap-1.5 h-8 px-3 rounded-lg shadow-md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentDialog({
                            open: true,
                            trainingId: session.id,
                            clientName: client?.name || 'Neznámý klient',
                          });
                        }}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Uhradit</span>
                      </Button>
                    )}
                  </div>
                </TrainingQuickMenu>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredSessions.length === 0 && (
        <div className="glass rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {sessions.length === 0 ? "Zatím žádné tréninky" : "Nic nenalezeno"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">
            {sessions.length === 0
              ? "Vytvořte první trénink"
              : "Upravte vyhledávání nebo filtry"}
          </p>
          {sessions.length === 0 && (
            <Button 
              className="mt-4 gap-2"
              onClick={() => setIsCreateSheetOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Nový trénink
            </Button>
          )}
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
    </div>
  );
}
