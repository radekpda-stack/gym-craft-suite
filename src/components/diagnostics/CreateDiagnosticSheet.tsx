import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiagnosticForm, DiagnosticFormValues } from "./DiagnosticForm";
import { Client } from "@/hooks/useClients";

interface CreateDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DiagnosticFormValues) => Promise<void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function CreateDiagnosticSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: CreateDiagnosticSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nová diagnostika</SheetTitle>
          <SheetDescription>
            Zaznamenejte diagnostický nález klienta.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <DiagnosticForm
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
