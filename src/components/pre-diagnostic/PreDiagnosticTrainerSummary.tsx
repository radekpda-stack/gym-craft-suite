import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  FileText, 
  CheckCircle2, 
  Save, 
  FileDown,
  Loader2,
  AlertCircle,
  Target,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  useUpdateTrainerSummary, 
  useApproveSummary,
  PreDiagnosticForm 
} from '@/hooks/usePreDiagnosticForms';

interface PreDiagnosticTrainerSummaryProps {
  form: PreDiagnosticForm;
  clientName: string;
  onExportPdf: () => void;
  isExporting?: boolean;
}

export function PreDiagnosticTrainerSummary({
  form,
  clientName,
  onExportPdf,
  isExporting = false,
}: PreDiagnosticTrainerSummaryProps) {
  const [summary, setSummary] = useState(form.trainer_summary || '');
  const [recommendations, setRecommendations] = useState(form.trainer_recommendations || '');
  const [restrictions, setRestrictions] = useState(form.trainer_restrictions || '');
  const [hasChanges, setHasChanges] = useState(false);

  const updateSummary = useUpdateTrainerSummary();
  const approveSummary = useApproveSummary();

  useEffect(() => {
    setSummary(form.trainer_summary || '');
    setRecommendations(form.trainer_recommendations || '');
    setRestrictions(form.trainer_restrictions || '');
    setHasChanges(false);
  }, [form]);

  const handleSummaryChange = (field: 'summary' | 'recommendations' | 'restrictions', value: string) => {
    if (field === 'summary') setSummary(value);
    if (field === 'recommendations') setRecommendations(value);
    if (field === 'restrictions') setRestrictions(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSummary.mutateAsync({
      formId: form.id,
      summary,
      recommendations,
      restrictions,
    });
    setHasChanges(false);
  };

  const handleApprove = async () => {
    // First save if there are changes
    if (hasChanges) {
      await handleSave();
    }
    await approveSummary.mutateAsync(form.id);
  };

  const isApproved = form.summary_approved;

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Trenérský souhrn pro klienta
        </h4>
        {isApproved && (
          <Badge variant="default" className="bg-success/20 text-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Schváleno {form.approved_at && format(new Date(form.approved_at), 'd. M. yyyy', { locale: cs })}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Tento souhrn bude viditelný v PDF exportu pro klienta. Klient neuvidí surová data ani odborné poznámky.
      </p>

      {/* Summary */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Celkové shrnutí
        </label>
        <Textarea
          value={summary}
          onChange={(e) => handleSummaryChange('summary', e.target.value)}
          placeholder="Stručné shrnutí stavu klienta a jeho připravenosti na trénink..."
          rows={3}
          className="resize-none"
          disabled={isApproved}
        />
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          Doporučení
        </label>
        <Textarea
          value={recommendations}
          onChange={(e) => handleSummaryChange('recommendations', e.target.value)}
          placeholder="Doporučení pro trénink, na co se zaměřit..."
          rows={3}
          className="resize-none"
          disabled={isApproved}
        />
      </div>

      {/* Restrictions */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Omezení a kontraindikace
        </label>
        <Textarea
          value={restrictions}
          onChange={(e) => handleSummaryChange('restrictions', e.target.value)}
          placeholder="Čemu se vyhnout, na co dát pozor..."
          rows={3}
          className="resize-none"
          disabled={isApproved}
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        {!isApproved && (
          <>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={!hasChanges || updateSummary.isPending}
              className="gap-2"
            >
              {updateSummary.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Uložit koncept
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveSummary.isPending || (!summary && !recommendations && !restrictions)}
              className="gap-2"
            >
              {approveSummary.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Schválit pro klienta
            </Button>
          </>
        )}
        
        {isApproved && (
          <Button
            onClick={onExportPdf}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Exportovat PDF
          </Button>
        )}
      </div>

      {!isApproved && !summary && !recommendations && !restrictions && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          Vyplňte alespoň jedno pole pro schválení souhrnu.
        </div>
      )}
    </div>
  );
}
