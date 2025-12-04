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
}

export function CreateTrainingSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: CreateTrainingSheetProps) {
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
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            defaultValues={defaultClientId ? { client_id: defaultClientId } : undefined}
            submitLabel="Vytvořit trénink"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
