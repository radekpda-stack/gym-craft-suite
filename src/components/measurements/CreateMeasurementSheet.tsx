import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MeasurementForm, MeasurementFormValues } from "./MeasurementForm";
import { Client } from "@/hooks/useClients";

interface CreateMeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MeasurementFormValues) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function CreateMeasurementSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: CreateMeasurementSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nové měření</SheetTitle>
          <SheetDescription>
            Zaznamenejte nové tělesné měření klienta.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <MeasurementForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            clients={clients}
            defaultClientId={defaultClientId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
