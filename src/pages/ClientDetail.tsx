import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Dumbbell,
  Activity,
  TrendingUp,
  Wallet,
  Camera,
  XCircle,
  Clock,
  Scale,
  Plus,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionCard } from '@/components/ui/session-card';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { useTrainingSessions, useUpdateTrainingSession, useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { useMeasurements, useCreateMeasurement } from '@/hooks/useMeasurements';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useClientBudgetGroup } from '@/hooks/useClientBudgetGroups';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { ClientFormValues } from '@/lib/validations/client';
import { CreditManagement } from '@/components/credit/CreditManagement';
import { ClientMediaTab } from '@/components/media/ClientMediaTab';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { ClientProgressTab } from '@/components/progress/ClientProgressTab';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { ClientMeasurementImport } from '@/components/measurements/ClientMeasurementImport';
import { TrainingQuickMenu } from '@/components/trainings/TrainingQuickMenu';
import { ClientSummaryCard } from '@/components/clients/ClientSummaryCard';
import { EnhancedCreditModal } from '@/components/credit/EnhancedCreditModal';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { ClientDiagnosticsTab } from '@/components/diagnostics/ClientDiagnosticsTab';
import { ClientDetailSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: allSessions = [] } = useTrainingSessions(id);
  const { data: measurements = [] } = useMeasurements(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: clientBudgetGroup } = useClientBudgetGroup(id);
  const { data: transactions = [] } = useCreditTransactions(id);
  const updateClient = useUpdateClient();
  const updateTraining = useUpdateTrainingSession();
  const createTraining = useCreateTrainingSession();
  const trainingPrices = useTrainingPrices();
  const createMeasurement = useCreateMeasurement();
  
  const [isCreateMeasurementOpen, setIsCreateMeasurementOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  // Cast sessions to proper type
  const clientSessions = allSessions.map(s => ({
    ...s,
    status: s.status as 'scheduled' | 'completed' | 'canceled'
  }));

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
      const session = allSessions.find(s => s.id === sessionId);
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

  if (clientLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Klient nenalezen
          </h2>
          <Link to="/clients" className="text-primary mt-2 inline-block">
            Zpět na seznam klientů
          </Link>
        </div>
      </div>
    );
  }

  const completedSessions = clientSessions.filter(s => s.status === 'completed');
  const scheduledSessions = clientSessions.filter(s => s.status === 'scheduled');
  
  // Check if client is in a shared budget group
  const isSharedBudget = !!clientBudgetGroup?.group;
  
  // Get unpaid stats for this client
  const unpaidCount = unpaidTrainings.length;
  const unpaidTotal = unpaidTrainings.reduce((sum, t) => sum + (t.final_price || 0), 0);
  
  // Get last payment info
  const lastPaymentTransaction = transactions
    .filter(t => t.type === 'payment' || t.type === 'manual')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  
  const lastPaymentDate = lastPaymentTransaction 
    ? format(new Date(lastPaymentTransaction.created_at), 'd.M.yyyy', { locale: cs })
    : undefined;
  const lastPaymentMethod = lastPaymentTransaction?.payment_method;
  
  // Get next scheduled training
  const nextTraining = scheduledSessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const nextTrainingDate = nextTraining 
    ? format(new Date(nextTraining.date), 'd.M.yyyy', { locale: cs })
    : undefined;
  const nextTrainingTime = nextTraining
    ? format(new Date(nextTraining.date), 'HH:mm')
    : undefined;

  /** Handle client data save */
  const handleSaveClient = async (data: ClientFormValues) => {
    await updateClient.mutateAsync({ id: client.id, values: data });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumbs */}
      <PageBreadcrumbs
        items={[
          { label: 'Klienti', href: '/clients' },
          { label: client.name },
        ]}
      />

      {/* Client Summary Card - New UI */}
      <ClientSummaryCard
        client={client}
        creditBalance={isSharedBudget ? (clientBudgetGroup?.group?.shared_balance || 0) : (client.credit_balance || 0)}
        isSharedBudget={isSharedBudget}
        unpaidCount={unpaidCount}
        unpaidTotal={unpaidTotal}
        lastPaymentDate={lastPaymentDate}
        lastPaymentMethod={lastPaymentMethod}
        nextTrainingDate={nextTrainingDate}
        nextTrainingTime={nextTrainingTime}
        onAddTraining={() => setIsTrainingDialogOpen(true)}
        onAddCredit={() => setIsCreditModalOpen(true)}
        onPayUnpaid={() => setIsCreditModalOpen(true)}
      />

      {/* Client Detail View with inline editing */}
      <ClientDetailView
        client={client}
        onSave={handleSaveClient}
        isLoading={updateClient.isPending}
      />
      
      {/* Dialogs */}
      <CreateTrainingDialog
        open={isTrainingDialogOpen}
        onOpenChange={setIsTrainingDialogOpen}
        defaultClientId={client.id}
      />
      
      <EnhancedCreditModal
        open={isCreditModalOpen}
        onOpenChange={setIsCreditModalOpen}
        defaultClientId={client.id}
      />

      {/* Tabs - Simplified structure */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-secondary/50 p-1 rounded-xl inline-flex gap-1 min-w-max">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              Přehled
            </TabsTrigger>
            <TabsTrigger
              value="trainings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <Dumbbell className="w-4 h-4 mr-1" />
              Tréninky
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Progres
            </TabsTrigger>
            <TabsTrigger
              value="measurements"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <Scale className="w-4 h-4 mr-1" />
              Měření
            </TabsTrigger>
            <TabsTrigger
              value="diagnostics"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <Stethoscope className="w-4 h-4 mr-1" />
              Diagnostika
            </TabsTrigger>
            <TabsTrigger
              value="credit"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <Wallet className="w-4 h-4 mr-1" />
              Kredit
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 text-sm"
            >
              <Camera className="w-4 h-4 mr-1" />
              Média
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {/* Compact Stats */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-primary" />
                <strong>{completedSessions.length}</strong> dokončených
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <strong>{scheduledSessions.length}</strong> naplánovaných
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <strong>{measurements.length}</strong> měření
              </span>
            </div>
          </div>

          {/* Upcoming trainings */}
          {scheduledSessions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Nadcházející tréninky</h3>
              <div className="space-y-2">
                {scheduledSessions.slice(0, 3).map((session) => (
                  <TrainingQuickMenu
                    key={session.id}
                    session={session}
                    onComplete={() => handleCompleteTraining(session.id)}
                    onCancel={() => handleCancelTraining(session.id)}
                  >
                    <div>
                      <SessionCard session={session} client={client} compact />
                    </div>
                  </TrainingQuickMenu>
                ))}
              </div>
            </div>
          )}

          {/* Recent completed */}
          {completedSessions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Poslední tréninky</h3>
              <div className="space-y-2">
                {completedSessions.slice(0, 3).map((session) => (
                  <TrainingQuickMenu
                    key={session.id}
                    session={session}
                    onComplete={() => handleCompleteTraining(session.id)}
                    onCancel={() => handleCancelTraining(session.id)}
                  >
                    <div>
                      <SessionCard session={session} client={client} compact />
                    </div>
                  </TrainingQuickMenu>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trainings" className="space-y-3">
          {clientSessions.length > 0 ? (
            clientSessions.map((session) => (
              <TrainingQuickMenu
                key={session.id}
                session={session}
                onComplete={() => handleCompleteTraining(session.id)}
                onCancel={() => handleCancelTraining(session.id)}
              >
                <div>
                  <SessionCard session={session} client={client} />
                </div>
              </TrainingQuickMenu>
            ))
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground">Zatím žádné tréninky</h3>
              <Link to="/trainings">
                <Button className="mt-3" size="sm">Vytvořit trénink</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ClientProgressTab clientId={client.id} clientName={client.name} />
        </TabsContent>

        <TabsContent value="measurements" className="space-y-4">
          {/* Import + Manual entry */}
          <div className="flex gap-2 flex-wrap">
            <ClientMeasurementImport 
              clientId={client.id} 
              clientName={client.name}
            />
            <Button 
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsCreateMeasurementOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Ruční zadání
            </Button>
          </div>

          {/* Measurements List */}
          {measurements.length > 0 ? (
            <div className="space-y-2">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  className="glass rounded-xl p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {format(new Date(measurement.date), 'd. MMMM yyyy', { locale: cs })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <p className="text-muted-foreground">Váha</p>
                        <p className="font-semibold text-foreground">{measurement.weight} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Tuk</p>
                        <p className="font-semibold text-foreground">{measurement.body_fat_percentage}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Svaly</p>
                        <p className="font-semibold text-foreground">{measurement.muscle_mass} kg</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground">Zatím žádná měření</h3>
            </div>
          )}

          <CreateMeasurementSheet
            open={isCreateMeasurementOpen}
            onOpenChange={setIsCreateMeasurementOpen}
            onSubmit={async (data) => {
              if (data.client_id) {
                await createMeasurement.mutateAsync(data as any);
              }
              setIsCreateMeasurementOpen(false);
            }}
            isLoading={createMeasurement.isPending}
            clients={[client]}
            defaultClientId={client.id}
          />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-3">
          <ClientDiagnosticsTab clientId={client.id} clientName={client.name} />
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <CreditManagement
            clientId={client.id}
            clientName={client.name}
            currentBalance={client.credit_balance || 0}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <ClientMediaTab clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
