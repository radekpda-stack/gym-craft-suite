import { useState } from 'react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { ClipboardList, Plus, Dumbbell, Scale, Stethoscope } from 'lucide-react';
import { useRecordsFeed } from '@/hooks/useRecordsFeed';
import { useClients } from '@/hooks/useClients';
import { useMeasurements, useCreateMeasurement } from '@/hooks/useMeasurements';
import { useTrainingSessions, useUpdateTrainingSession, useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useTrainingPrices } from '@/hooks/useAppSettings';
import { RecordsFilterBar } from '@/components/records/RecordsFilterBar';
import { RecordsFeed } from '@/components/records/RecordsFeed';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { QuickPaymentDialog } from '@/components/calendar/QuickPaymentDialog';
import { toast } from '@/hooks/use-toast';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { MeasurementFormValues } from '@/components/measurements/MeasurementForm';

export default function Records() {
  usePageTracking('records');
  
  const { 
    groupedRecords, 
    sortedDays, 
    counts, 
    filters, 
    setFilters, 
    isLoading 
  } = useRecordsFeed();
  
  const { data: clients = [] } = useClients();
  const { data: measurements = [] } = useMeasurements();
  const { data: trainings = [] } = useTrainingSessions();
  const trainingPrices = useTrainingPrices();
  const updateTraining = useUpdateTrainingSession();
  const createTraining = useCreateTrainingSession();
  const createMeasurement = useCreateMeasurement();
  
  // Sheets state
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [measurementSheetOpen, setMeasurementSheetOpen] = useState(false);
  const [diagnosticSheetOpen, setDiagnosticSheetOpen] = useState(false);
  
  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    trainingId: string;
    clientName: string;
    paymentStatus: string | null;
  }>({ open: false, trainingId: '', clientName: '', paymentStatus: null });
  
  // Duplicate state
  const [duplicateDefaults, setDuplicateDefaults] = useState<Partial<TrainingFormValues> | undefined>(undefined);
  
  // Training actions
  const handleTrainingComplete = async (sessionId: string) => {
    const session = trainings.find(t => t.id === sessionId);
    if (!session) return;
    
    const client = clients.find(c => c.id === session.client_id);
    const useCredit = client?.payment_mode === 'credit' || client?.payment_mode === 'mixed';
    
    await updateTraining.mutateAsync({
      id: sessionId,
      input: { status: 'completed' },
      trainingPrices: useCredit ? trainingPrices : undefined,
    });
  };
  
  const handleTrainingCancel = async (sessionId: string) => {
    await updateTraining.mutateAsync({
      id: sessionId,
      input: { 
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      },
    });
    toast({
      title: 'Trénink zrušen',
      description: 'Trénink byl označen jako zrušený.',
    });
  };
  
  const handleTrainingPay = (sessionId: string) => {
    const session = trainings.find(t => t.id === sessionId);
    if (!session) return;
    
    const client = clients.find(c => c.id === session.client_id);
    
    setPaymentDialog({
      open: true,
      trainingId: sessionId,
      clientName: client?.name || 'Klient',
      paymentStatus: session.payment_status as string | null,
    });
  };
  
  const handleTrainingDuplicate = (sessionId: string) => {
    const session = trainings.find(t => t.id === sessionId);
    if (session) {
      setDuplicateDefaults({
        client_id: session.client_id,
        duration: session.duration,
        notes: session.notes || '',
        participant_count: session.participant_count || 1,
      });
      setTrainingSheetOpen(true);
    }
  };
  
  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    await createTraining.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      duration: data.duration,
      notes: data.notes,
      participant_count: data.participant_count,
      status: data.status,
      recurrence_type: data.recurrence_type || undefined,
    });
    setTrainingSheetOpen(false);
    setDuplicateDefaults(undefined);
  };
  
  const handleCreateMeasurement = async (data: MeasurementFormValues): Promise<string | void> => {
    const result = await createMeasurement.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      weight: data.weight,
      body_fat_percentage: data.body_fat_percentage,
      muscle_mass: data.muscle_mass,
      notes: data.notes,
    });
    setMeasurementSheetOpen(false);
    return result?.id;
  };
  
  const handleOpenCreateMenu = () => {
    setTrainingSheetOpen(true);
  };

  const activeClients = clients.filter(c => !c.is_archived);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary shrink-0" />
            <span className="truncate">Záznamy</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Chronologický přehled tréninků, měření a diagnostiky
          </p>
        </div>
        
        {/* Add button with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Přidat</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setTrainingSheetOpen(true)} className="gap-2">
              <Dumbbell className="w-4 h-4" />
              Trénink
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMeasurementSheetOpen(true)} className="gap-2">
              <Scale className="w-4 h-4" />
              Měření
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDiagnosticSheetOpen(true)} className="gap-2">
              <Stethoscope className="w-4 h-4" />
              Diagnostika
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Filter bar */}
      <RecordsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        counts={counts}
      />
      
      {/* Feed */}
      <RecordsFeed
        groupedRecords={groupedRecords}
        sortedDays={sortedDays}
        clients={clients}
        measurements={measurements}
        isLoading={isLoading}
        onTrainingComplete={handleTrainingComplete}
        onTrainingCancel={handleTrainingCancel}
        onTrainingPay={handleTrainingPay}
        onTrainingDuplicate={handleTrainingDuplicate}
        onCreateRecord={handleOpenCreateMenu}
      />
      
      {/* Create sheets */}
      <CreateTrainingSheet
        open={trainingSheetOpen}
        onOpenChange={(open) => {
          setTrainingSheetOpen(open);
          if (!open) setDuplicateDefaults(undefined);
        }}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={activeClients}
        defaultValues={duplicateDefaults}
      />
      
      <CreateMeasurementSheet
        open={measurementSheetOpen}
        onOpenChange={setMeasurementSheetOpen}
        onSubmit={handleCreateMeasurement}
        isLoading={createMeasurement.isPending}
        clients={activeClients}
      />
      
      <CreateDiagnosticSheet
        open={diagnosticSheetOpen}
        onOpenChange={setDiagnosticSheetOpen}
        clients={activeClients}
      />
      
      {/* Payment dialog */}
      <QuickPaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
        trainingId={paymentDialog.trainingId}
        clientName={paymentDialog.clientName}
        currentPaymentStatus={paymentDialog.paymentStatus}
      />
    </div>
  );
}
