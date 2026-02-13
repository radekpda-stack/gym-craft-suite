import { useState } from 'react';
import { toLocalISOString } from '@/utils/dateUtils';
import { Plus, Dumbbell, Activity, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CreateMeasurementSheet } from '@/components/measurements/CreateMeasurementSheet';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { TrainingFormValues } from '@/components/trainings/TrainingForm';
import { MeasurementFormValues } from '@/components/measurements/MeasurementForm';

export function NewRecordButton() {
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isMeasurementOpen, setIsMeasurementOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);

  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  const createMeasurement = useCreateMeasurement();

  const handleCreateTraining = async (data: TrainingFormValues, tagIds: string[]) => {
    await createTraining.mutateAsync({
      client_id: data.client_id,
      date: toLocalISOString(data.date),
      duration: data.duration,
      notes: data.notes,
      status: data.status,
    });
    setIsTrainingOpen(false);
  };

  const handleCreateMeasurement = async (data: MeasurementFormValues) => {
    await createMeasurement.mutateAsync({
      client_id: data.client_id,
      date: data.date,
      weight: data.weight,
      body_fat_percentage: data.body_fat_percentage,
      muscle_mass: data.muscle_mass,
      basal_metabolism: data.basal_metabolism,
      chest: data.chest,
      waist: data.waist,
      hips: data.hips,
      mental_state: data.mental_state || undefined,
      notes: data.notes,
    });
    setIsMeasurementOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nový záznam</span>
            <span className="sm:hidden">Nový</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsTrainingOpen(true)}>
            <Dumbbell className="w-4 h-4 mr-2" />
            Trénink
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsMeasurementOpen(true)}>
            <Activity className="w-4 h-4 mr-2" />
            Měření
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSaleOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Prodej produktu
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTrainingSheet
        open={isTrainingOpen}
        onOpenChange={setIsTrainingOpen}
        onSubmit={handleCreateTraining}
        clients={clients}
        isLoading={createTraining.isPending}
      />

      <CreateMeasurementSheet
        open={isMeasurementOpen}
        onOpenChange={setIsMeasurementOpen}
        onSubmit={handleCreateMeasurement}
        clients={clients}
        isLoading={createMeasurement.isPending}
      />

      <NewSaleDialog
        open={isSaleOpen}
        onOpenChange={setIsSaleOpen}
      />
    </>
  );
}
