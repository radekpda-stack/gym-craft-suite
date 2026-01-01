import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TrainingForm, TrainingFormValues } from "./TrainingForm";
import { Client } from "@/hooks/useClients";
import { TrainingSession } from "@/hooks/useTrainingSessions";

interface EditTrainingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  training: TrainingSession | null;
  defaultTagIds?: string[];
}

export function EditTrainingSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  training,
  defaultTagIds = [],
}: EditTrainingSheetProps) {
  if (!training) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Upravit trénink</SheetTitle>
          <SheetDescription>
            Upravte údaje tréninku.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <TrainingForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            defaultValues={{
              client_id: training.client_id,
              date: training.date.slice(0, 16),
              duration: training.duration,
              participant_count: training.participant_count || 1,
              notes: training.notes,
              status: training.status,
              training_type: training.training_type as any,
            }}
            submitLabel="Uložit změny"
            showRecurrence={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
