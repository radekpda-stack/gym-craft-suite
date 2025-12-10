import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedTrainingForm, EnhancedTrainingFormValues } from "./EnhancedTrainingForm";
import { Client } from "@/hooks/useClients";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EnhancedTrainingFormValues, tagIds: string[]) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  trainingPrices: Record<string, number>;
  defaultClientId?: string;
  defaultDate?: string;
  defaultValues?: Partial<EnhancedTrainingFormValues>;
}

export function CreateTrainingDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  trainingPrices,
  defaultClientId,
  defaultDate,
  defaultValues: propDefaultValues,
}: CreateTrainingDialogProps) {
  const defaultValues: Partial<EnhancedTrainingFormValues> = { ...propDefaultValues };
  
  if (defaultClientId && !defaultValues.client_id) {
    defaultValues.client_id = defaultClientId;
  }
  
  if (defaultDate && !defaultValues.date) {
    defaultValues.date = defaultDate;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Nový trénink</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          <EnhancedTrainingForm
            key={defaultDate || defaultClientId || 'new'}
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            trainingPrices={trainingPrices}
            defaultValues={Object.keys(defaultValues).length > 0 ? defaultValues : undefined}
            submitLabel="Vytvořit trénink"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}