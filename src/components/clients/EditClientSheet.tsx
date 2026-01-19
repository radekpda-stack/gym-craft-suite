import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientFormStepper } from "./ClientFormStepper";
import { ClientFormValues } from "@/lib/validations/client";
import { Client } from "@/hooks/useClients";

interface EditClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
  client: Client | null;
}

export function EditClientSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  client,
}: EditClientSheetProps) {
  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Upravit klienta</SheetTitle>
          <SheetDescription>
            Upravte údaje klienta {client.name}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ClientFormStepper 
            onSubmit={onSubmit} 
            isLoading={isLoading} 
            defaultValues={client}
            submitLabel="Uložit změny"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
