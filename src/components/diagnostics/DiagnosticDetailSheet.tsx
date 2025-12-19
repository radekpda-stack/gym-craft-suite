import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { DiagnosticDetailView } from './DiagnosticDetailView';
import { DiagnosticWithAssessment } from '@/hooks/useDiagnosticAssessments';
import { Diagnostic } from '@/hooks/useDiagnostics';

interface DiagnosticDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic: Diagnostic | null;
}

export function DiagnosticDetailSheet({
  open,
  onOpenChange,
  diagnostic,
}: DiagnosticDetailSheetProps) {
  if (!diagnostic) return null;

  // Convert Diagnostic to DiagnosticWithAssessment format
  const diagnosticWithAssessment: DiagnosticWithAssessment = {
    ...diagnostic,
    assessment: undefined,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-6">
          <DiagnosticDetailView
            diagnostic={diagnosticWithAssessment}
            onBack={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
