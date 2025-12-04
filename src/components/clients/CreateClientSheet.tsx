import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientForm } from "./ClientForm";
import { ClientFormValues } from "@/lib/validations/client";

interface CreateClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function CreateClientSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateClientSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nový klient</SheetTitle>
          <SheetDescription>
            Vyplňte údaje o novém klientovi. Pole označená * jsou povinná.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ClientForm onSubmit={onSubmit} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
