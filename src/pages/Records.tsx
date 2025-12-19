import { useState } from 'react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { ClipboardList, Plus, Scale, Stethoscope } from 'lucide-react';
import { useRecordsFeed } from '@/hooks/useRecordsFeed';
import { useClients, Client } from '@/hooks/useClients';
import { useMeasurements, useCreateMeasurement, Measurement } from '@/hooks/useMeasurements';
import { Diagnostic } from '@/hooks/useDiagnostics';
import { RecordsFilterBar } from '@/components/records/RecordsFilterBar';
import { RecordsFeed } from '@/components/records/RecordsFeed';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { EditMeasurementSheet } from '@/components/measurements/EditMeasurementSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { EditDiagnosticSheet } from '@/components/diagnostics/EditDiagnosticSheet';
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
  const createMeasurement = useCreateMeasurement();
  
  // Sheets state
  const [measurementSheetOpen, setMeasurementSheetOpen] = useState(false);
  const [diagnosticSheetOpen, setDiagnosticSheetOpen] = useState(false);
  
  // Edit/Detail state
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [selectedMeasurementClient, setSelectedMeasurementClient] = useState<Client | null>(null);
  const [editMeasurementOpen, setEditMeasurementOpen] = useState(false);
  
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<Diagnostic | null>(null);
  const [selectedDiagnosticClient, setSelectedDiagnosticClient] = useState<Client | null>(null);
  const [editDiagnosticOpen, setEditDiagnosticOpen] = useState(false);
  
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
    setMeasurementSheetOpen(true);
  };

  const handleMeasurementClick = (measurement: Measurement, client: Client | null) => {
    setSelectedMeasurement(measurement);
    setSelectedMeasurementClient(client);
    setEditMeasurementOpen(true);
  };

  const handleDiagnosticClick = (diagnostic: Diagnostic, client: Client | null) => {
    setSelectedDiagnostic(diagnostic);
    setSelectedDiagnosticClient(client);
    setEditDiagnosticOpen(true);
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
            Chronologický přehled měření a diagnostiky
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
        onCreateRecord={handleOpenCreateMenu}
        onMeasurementClick={handleMeasurementClick}
        onDiagnosticClick={handleDiagnosticClick}
      />
      
      {/* Create sheets */}
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

      {/* Edit/Detail sheets */}
      <EditMeasurementSheet
        open={editMeasurementOpen}
        onOpenChange={setEditMeasurementOpen}
        measurement={selectedMeasurement}
        client={selectedMeasurementClient}
      />

      <EditDiagnosticSheet
        open={editDiagnosticOpen}
        onOpenChange={setEditDiagnosticOpen}
        diagnostic={selectedDiagnostic}
        clientName={selectedDiagnosticClient?.name}
      />
    </div>
  );
}
