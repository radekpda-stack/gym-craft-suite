import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TrainingForm, TrainingFormValues } from "./TrainingForm";
import { Client } from "@/hooks/useClients";

interface CreateTrainingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
  defaultDate?: string;
  defaultValues?: Partial<TrainingFormValues>;
}

export function CreateTrainingSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
  defaultDate,
  defaultValues: propDefaultValues,
}: CreateTrainingSheetProps) {
  const defaultValues: Partial<TrainingFormValues> = { ...propDefaultValues };
  
  if (defaultClientId && !defaultValues.client_id) {
    defaultValues.client_id = defaultClientId;
  }
  
  if (defaultDate && !defaultValues.date) {
    defaultValues.date = defaultDate;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nový trénink</SheetTitle>
          <SheetDescription>
            Vytvořte nový trénink pro klienta.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <TrainingForm
            key={defaultDate || 'new'}
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            defaultValues={Object.keys(defaultValues).length > 0 ? defaultValues : undefined}
            submitLabel="Vytvořit trénink"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
