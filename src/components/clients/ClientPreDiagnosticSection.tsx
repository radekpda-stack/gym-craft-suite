import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatDate } from '@/lib/formatters';
import {
  ClipboardList,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Activity,
  Moon,
  Dumbbell,
  Target,
  AlertCircle,
  Ruler,
  Scale,
  Briefcase,
  Heart,
  Pencil,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  useClientPreDiagnostic, 
  usePreDiagnosticAnswers, 
  useCreateClientPreDiagnostic,
  PreDiagnosticAnswer,
} from '@/hooks/usePreDiagnosticForms';
import { EditPreDiagnosticAnswerDialog } from '@/components/pre-diagnostic/EditPreDiagnosticAnswerDialog';
import { PreDiagnosticTrainerSummary } from '@/components/pre-diagnostic/PreDiagnosticTrainerSummary';
import { exportPreDiagnosticPdf } from '@/components/pre-diagnostic/PreDiagnosticPdfExport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientPreDiagnosticSectionProps {
  clientId: string;
  clientName: string;
}

// Field labels for display
const FIELD_LABELS: Record<string, { label: string; icon?: React.ReactNode }> = {
  age: { label: 'Věk', icon: <Ruler className="w-4 h-4" /> },
  height: { label: 'Výška (cm)', icon: <Ruler className="w-4 h-4" /> },
  weight: { label: 'Váha (kg)', icon: <Scale className="w-4 h-4" /> },
  daily_activity_type: { label: 'Typ denní aktivity', icon: <Briefcase className="w-4 h-4" /> },
  occupation: { label: 'Zaměstnání', icon: <Briefcase className="w-4 h-4" /> },
  current_activities: { label: 'Aktuální aktivity', icon: <Activity className="w-4 h-4" /> },
  movement_frequency: { label: 'Frekvence pohybu', icon: <Activity className="w-4 h-4" /> },
  movement_experience: { label: 'Zkušenosti s cvičením', icon: <Dumbbell className="w-4 h-4" /> },
  exercise_experience: { label: 'Zkušenosti s cvičením', icon: <Dumbbell className="w-4 h-4" /> },
  sleep_hours_avg: { label: 'Průměrný spánek', icon: <Moon className="w-4 h-4" /> },
  sleep_quality: { label: 'Kvalita spánku', icon: <Moon className="w-4 h-4" /> },
  main_goal: { label: 'Hlavní cíl', icon: <Target className="w-4 h-4" /> },
  priorities: { label: 'Priority', icon: <Target className="w-4 h-4" /> },
  goals: { label: 'Cíle', icon: <Target className="w-4 h-4" /> },
  has_pain: { label: 'Bolesti', icon: <AlertCircle className="w-4 h-4" /> },
  pain_areas: { label: 'Oblasti bolesti', icon: <AlertCircle className="w-4 h-4" /> },
  pain_type: { label: 'Typ bolesti', icon: <AlertCircle className="w-4 h-4" /> },
  pain_duration: { label: 'Trvání bolesti', icon: <AlertCircle className="w-4 h-4" /> },
  pain_limitation: { label: 'Omezení kvůli bolesti', icon: <AlertCircle className="w-4 h-4" /> },
  injury_history: { label: 'Historie zranění', icon: <Heart className="w-4 h-4" /> },
  injury_details: { label: 'Detail zranění', icon: <Heart className="w-4 h-4" /> },
  surgery_history: { label: 'Historie operací', icon: <Heart className="w-4 h-4" /> },
  surgery_details: { label: 'Detail operací', icon: <Heart className="w-4 h-4" /> },
  medications: { label: 'Užívá léky', icon: <Heart className="w-4 h-4" /> },
  medication_details: { label: 'Detail léků', icon: <Heart className="w-4 h-4" /> },
  health_notes: { label: 'Zdravotní poznámky', icon: <Heart className="w-4 h-4" /> },
  open_question: { label: 'Otevřená otázka', icon: <ClipboardList className="w-4 h-4" /> },
  expectations: { label: 'Očekávání', icon: <Target className="w-4 h-4" /> },
};

// Fields to skip (already shown in main client card)
const SKIP_FIELDS = ['name', 'email', 'phone', 'gender', 'birth_date'];

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// Reusable answer card component with edit button and source indicator
function AnswerCard({
  answer,
  onEdit,
}: {
  answer: PreDiagnosticAnswer;
  onEdit: (answer: PreDiagnosticAnswer) => void;
}) {
  const isEdited = answer.edited_by_trainer === true;
  
  return (
    <div className="bg-muted/50 rounded-lg p-3 group relative">
      <button
        onClick={() => onEdit(answer)}
        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
        title="Upravit"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 pr-6">
        <p className="text-xs text-muted-foreground">
          {FIELD_LABELS[answer.field_key]?.label || answer.field_key}
        </p>
        {isEdited ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-warning/10 text-warning border-warning/30">
            <Pencil className="w-2.5 h-2.5 mr-0.5" />
            Upraveno
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
            <User className="w-2.5 h-2.5 mr-0.5" />
            Od klienta
          </Badge>
        )}
      </div>
      <p className="font-medium text-foreground mt-1">{formatValue(answer.value)}</p>
      {isEdited && answer.original_value !== undefined && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          Původně: {formatValue(answer.original_value)}
        </p>
      )}
    </div>
  );
}

export function ClientPreDiagnosticSection({ clientId, clientName }: ClientPreDiagnosticSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<PreDiagnosticAnswer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: preDiagnostic, isLoading: loadingForm } = useClientPreDiagnostic(clientId);
  const { data: answers = [], isLoading: loadingAnswers } = usePreDiagnosticAnswers(preDiagnostic?.id);
  const createPreDiagnostic = useCreateClientPreDiagnostic();

  const handleEditAnswer = (answer: PreDiagnosticAnswer) => {
    setEditingAnswer(answer);
    setEditDialogOpen(true);
  };

  const handleExportPdf = async () => {
    if (!preDiagnostic) return;
    
    setIsExporting(true);
    try {
      await exportPreDiagnosticPdf({
        form: preDiagnostic,
        clientName,
      });
      toast.success('PDF bylo úspěšně vygenerováno');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Nepodařilo se vygenerovat PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingForm || loadingAnswers;

  const handleCreateInvite = async () => {
    try {
      const result = await createPreDiagnostic.mutateAsync(clientId);
      const link = `${window.location.origin}/pre-diagnostic/${result.token}`;
      await navigator.clipboard.writeText(link);
      toast.success('Odkaz na formulář byl zkopírován do schránky');
    } catch (error) {
      console.error('Error creating pre-diagnostic:', error);
    }
  };

  const copyLink = async () => {
    if (!preDiagnostic) return;
    const link = `${window.location.origin}/pre-diagnostic/${preDiagnostic.token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Odkaz zkopírován');
  };

  // Filter answers to display
  const displayAnswers = answers.filter(a => !SKIP_FIELDS.includes(a.field_key));

  // Group answers by category
  const groupedAnswers = {
    basic: displayAnswers.filter(a => ['age', 'height', 'weight', 'daily_activity_type', 'occupation'].includes(a.field_key)),
    activity: displayAnswers.filter(a => ['current_activities', 'movement_frequency', 'movement_experience', 'exercise_experience'].includes(a.field_key)),
    sleep: displayAnswers.filter(a => ['sleep_hours_avg', 'sleep_quality'].includes(a.field_key)),
    goals: displayAnswers.filter(a => ['main_goal', 'priorities', 'goals', 'expectations'].includes(a.field_key)),
    health: displayAnswers.filter(a => ['has_pain', 'pain_areas', 'pain_type', 'pain_duration', 'pain_limitation', 'injury_history', 'injury_details', 'surgery_history', 'surgery_details', 'medications', 'medication_details', 'health_notes'].includes(a.field_key)),
    other: displayAnswers.filter(a => !['age', 'height', 'weight', 'daily_activity_type', 'occupation', 'current_activities', 'movement_frequency', 'movement_experience', 'exercise_experience', 'sleep_hours_avg', 'sleep_quality', 'main_goal', 'priorities', 'goals', 'expectations', 'has_pain', 'pain_areas', 'pain_type', 'pain_duration', 'pain_limitation', 'injury_history', 'injury_details', 'surgery_history', 'surgery_details', 'medications', 'medication_details', 'health_notes'].includes(a.field_key)),
  };

  const hasCompletedForm = preDiagnostic?.status === 'completed';
  const hasPendingForm = preDiagnostic && preDiagnostic.status !== 'completed';

  // Count edited answers
  const editedCount = answers.filter(a => a.edited_by_trainer === true).length;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Pre-diagnostika</span>
              {hasCompletedForm && (
                <Badge variant="default" className="bg-success/20 text-success">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Vyplněno
                </Badge>
              )}
              {hasPendingForm && (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Čeká na vyplnění
                </Badge>
              )}
              {!preDiagnostic && (
                <Badge variant="outline" className="text-muted-foreground">
                  Nevyplněno
                </Badge>
              )}
              {editedCount > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <Pencil className="w-3 h-3 mr-1" />
                  {editedCount} upraveno
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 border-t border-border">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 py-4">
              {!preDiagnostic && (
                <Button
                  onClick={handleCreateInvite}
                  disabled={createPreDiagnostic.isPending}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Odeslat formulář klientovi
                </Button>
              )}
              {hasPendingForm && (
                <>
                  <Button variant="outline" onClick={copyLink} className="gap-2">
                    <Copy className="w-4 h-4" />
                    Zkopírovat odkaz
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => window.open(`/pre-diagnostic/${preDiagnostic.token}`, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Otevřít formulář
                  </Button>
                </>
              )}
              {hasCompletedForm && (
                <Button
                  variant="outline"
                  onClick={handleCreateInvite}
                  disabled={createPreDiagnostic.isPending}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Odeslat nový formulář
                </Button>
              )}
            </div>

            {/* Form completion info */}
            {preDiagnostic?.completed_at && (
              <p className="text-sm text-muted-foreground mb-4">
                Vyplněno: {formatDate(preDiagnostic.completed_at, 'dateTimeVerbose')}
              </p>
            )}

            {/* Answers display */}
            {hasCompletedForm && displayAnswers.length > 0 && (
              <div className="space-y-4">
                {/* Basic info */}
                {groupedAnswers.basic.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Základní údaje
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {groupedAnswers.basic.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity */}
                {groupedAnswers.activity.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Pohybová aktivita
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupedAnswers.activity.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep */}
                {groupedAnswers.sleep.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Spánek
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {groupedAnswers.sleep.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Goals */}
                {groupedAnswers.goals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Cíle a priority
                    </h4>
                    <div className="space-y-3">
                      {groupedAnswers.goals.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Health */}
                {groupedAnswers.health.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Zdravotní stav
                    </h4>
                    <div className="space-y-3">
                      {groupedAnswers.health.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other */}
                {groupedAnswers.other.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Ostatní
                    </h4>
                    <div className="space-y-3">
                      {groupedAnswers.other.map((answer) => (
                        <AnswerCard key={answer.field_key} answer={answer} onEdit={handleEditAnswer} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Trainer Summary Section */}
                <PreDiagnosticTrainerSummary
                  form={preDiagnostic}
                  clientName={clientName}
                  onExportPdf={handleExportPdf}
                  isExporting={isExporting}
                />
              </div>
            )}

            {/* No data message */}
            {hasCompletedForm && displayAnswers.length === 0 && !isLoading && (
              <p className="text-muted-foreground text-sm italic py-2">
                Žádná data k zobrazení
              </p>
            )}

            {/* Pending form message */}
            {hasPendingForm && (
              <p className="text-muted-foreground text-sm py-2">
                Formulář byl odeslán a čeká na vyplnění klientem.
                {preDiagnostic.expires_at && (
                  <span className="block mt-1">
                    Platnost do: {formatDate(preDiagnostic.expires_at, 'long')}
                  </span>
                )}
              </p>
            )}

            {/* No form message */}
            {!preDiagnostic && !isLoading && (
              <p className="text-muted-foreground text-sm py-2">
                Klient zatím nevyplnil pre-diagnostický formulář. Kliknutím na tlačítko výše můžete odeslat odkaz na formulář.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit dialog */}
      <EditPreDiagnosticAnswerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        answer={editingAnswer}
        fieldLabel={editingAnswer ? (FIELD_LABELS[editingAnswer.field_key]?.label || editingAnswer.field_key) : ''}
      />
    </div>
  );
}
