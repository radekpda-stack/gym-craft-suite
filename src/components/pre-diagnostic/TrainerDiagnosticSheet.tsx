import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TrainerDiagnosticForm } from './TrainerDiagnosticForm';
import { PreDiagnosticForm } from '@/hooks/usePreDiagnosticForms';

interface TrainerDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PreDiagnosticForm | null;
  clientName: string;
}

export function TrainerDiagnosticSheet({
  open,
  onOpenChange,
  form,
  clientName,
}: TrainerDiagnosticSheetProps) {
  if (!form) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Trenérská diagnostika</SheetTitle>
        </SheetHeader>
        <TrainerDiagnosticForm
          form={form}
          clientName={clientName}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
