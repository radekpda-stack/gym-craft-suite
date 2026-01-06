import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TrainingForm, TrainingFormValues } from "./TrainingForm";
import { Client } from "@/hooks/useClients";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const defaultValues: Partial<TrainingFormValues> = { ...propDefaultValues };
  
  if (defaultClientId && !defaultValues.client_id) {
    defaultValues.client_id = defaultClientId;
  }
  
  if (defaultDate && !defaultValues.date) {
    defaultValues.date = defaultDate;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={
        isMobile 
          ? "w-full h-full max-w-none inset-0 rounded-none flex flex-col"
          : "w-full sm:max-w-lg overflow-y-auto"
      }>
        <SheetHeader className="shrink-0">
          <SheetTitle>Nový trénink</SheetTitle>
          <SheetDescription>
            Vytvořte nový trénink pro klienta.
          </SheetDescription>
        </SheetHeader>
        <div className={isMobile ? "flex-1 overflow-y-auto mt-6" : "mt-6"}>
          <TrainingForm
            key={defaultDate || 'new'}
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            defaultValues={Object.keys(defaultValues).length > 0 ? defaultValues : undefined}
            submitLabel="Vytvořit trénink"
            stickySubmit={isMobile}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
