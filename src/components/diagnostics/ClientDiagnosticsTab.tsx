import { useState } from 'react';
import { Plus, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagnosticAssessments, DiagnosticWithAssessment } from '@/hooks/useDiagnosticAssessments';
import { useClients, Client } from '@/hooks/useClients';
import { DiagnosticHistoryCard } from './DiagnosticHistoryCard';
import { DiagnosticDetailView } from './DiagnosticDetailView';
import { CreateDiagnosticSheet } from './CreateDiagnosticSheet';

interface ClientDiagnosticsTabProps {
  clientId: string;
  clientName: string;
}

export function ClientDiagnosticsTab({ clientId, clientName }: ClientDiagnosticsTabProps) {
  const { data: clients = [] } = useClients();
  const { data: diagnostics = [], isLoading } = useDiagnosticAssessments(clientId);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticWithAssessment | null>(null);
  const [compareDiagnostic, setCompareDiagnostic] = useState<DiagnosticWithAssessment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCompareToggle = (diag: DiagnosticWithAssessment) => {
    if (compareDiagnostic?.id === diag.id) {
      setCompareDiagnostic(null);
    } else {
      setCompareDiagnostic(diag);
    }
  };

  // Show detail view if a diagnostic is selected
  if (selectedDiagnostic) {
    return (
      <DiagnosticDetailView
        diagnostic={selectedDiagnostic}
        onBack={() => {
          setSelectedDiagnostic(null);
          setCompareDiagnostic(null);
        }}
        compareWith={compareDiagnostic?.id !== selectedDiagnostic.id ? compareDiagnostic : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-muted-foreground text-sm">
          Historie diagnostik ({diagnostics.length})
        </h3>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Nová diagnostika
        </Button>
      </div>

      {/* Compare hint */}
      {compareDiagnostic && (
        <div className="glass rounded-lg p-3 bg-warning/10 border-warning/30">
          <p className="text-sm text-warning">
            Klikněte na jinou diagnostiku pro porovnání s vybranou
          </p>
        </div>
      )}

      {/* Diagnostics list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
              <div className="h-3 bg-secondary rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : diagnostics.length > 0 ? (
        <div className="space-y-3">
          {diagnostics.map((diag) => (
            <DiagnosticHistoryCard
              key={diag.id}
              diagnostic={diag}
              isSelected={selectedDiagnostic?.id === diag.id}
              onSelect={() => setSelectedDiagnostic(diag)}
              onCompareToggle={() => handleCompareToggle(diag)}
              isComparing={compareDiagnostic?.id === diag.id}
            />
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-8 text-center">
          <Stethoscope className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-foreground">Zatím žádná diagnostika</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Vytvořte první diagnostiku pro klienta {clientName}
          </p>
          <Button 
            className="mt-3" 
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Přidat diagnostiku
          </Button>
        </div>
      )}

      {/* Create diagnostic sheet */}
      <CreateDiagnosticSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
        defaultClientId={clientId}
      />
    </div>
  );
}
