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
  diagnostic: Diagnostic | DiagnosticWithAssessment | null;
}

export function DiagnosticDetailSheet({
  open,
  onOpenChange,
  diagnostic,
}: DiagnosticDetailSheetProps) {
  if (!diagnostic) return null;

  // Convert to DiagnosticWithAssessment format if needed
  const diagnosticWithAssessment: DiagnosticWithAssessment = {
    id: diagnostic.id,
    client_id: diagnostic.client_id,
    date: diagnostic.date,
    area_type: diagnostic.area_type,
    area_name: diagnostic.area_name,
    findings: diagnostic.findings,
    notes: diagnostic.notes,
    created_at: diagnostic.created_at,
    assessment: 'assessment' in diagnostic ? diagnostic.assessment : undefined,
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
