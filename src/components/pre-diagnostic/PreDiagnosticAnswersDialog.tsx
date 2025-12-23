import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';

interface PreDiagnosticAnswersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  clientName?: string | null;
}

// Question labels mapping
const questionLabels: Record<string, string> = {
  // Identity
  name: 'Jméno',
  email: 'Email',
  phone: 'Telefon',
  birthDate: 'Datum narození',
  gender: 'Pohlaví',
  
  // Basic context
  occupation: 'Zaměstnání',
  sittingHours: 'Hodiny sezení denně',
  handedness: 'Dominantní ruka',
  
  // Movement & Activity
  sportsHistory: 'Sportovní historie',
  currentActivities: 'Aktuální aktivity',
  trainingFrequency: 'Frekvence tréninku',
  trainingDuration: 'Délka tréninku',
  
  // Pain & Discomfort
  painAreas: 'Bolestivá místa',
  painDescription: 'Popis bolesti',
  painDuration: 'Jak dlouho bolest trvá',
  painTriggers: 'Co bolest spouští',
  
  // Health
  healthConditions: 'Zdravotní stav',
  medications: 'Léky',
  allergies: 'Alergie',
  surgeries: 'Operace',
  
  // Sleep & Recovery
  sleepHours: 'Hodiny spánku',
  sleepQuality: 'Kvalita spánku',
  stressLevel: 'Úroveň stresu',
  recoveryMethods: 'Metody regenerace',
  
  // Goals
  primaryGoal: 'Hlavní cíl',
  secondaryGoals: 'Vedlejší cíle',
  timeline: 'Časový horizont',
  motivation: 'Motivace',
  
  // Open
  additionalInfo: 'Další informace',
  questions: 'Dotazy',
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne';
  if (Array.isArray(value)) return value.join(', ') || '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PreDiagnosticAnswersDialog({
  open,
  onOpenChange,
  formId,
  clientName,
}: PreDiagnosticAnswersDialogProps) {
  const { data: answers = [], isLoading } = usePreDiagnosticAnswers(formId);

  // Group answers by section
  const groupedAnswers = answers.reduce((acc, answer) => {
    const section = answer.field_key.split('_')[0] || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(answer);
    return acc;
  }, {} as Record<string, typeof answers>);

  const sectionLabels: Record<string, string> = {
    identity: 'Identifikace',
    context: 'Základní kontext',
    movement: 'Pohyb a aktivita',
    pain: 'Bolest a dyskomfort',
    health: 'Zdraví',
    sleep: 'Spánek a regenerace',
    goals: 'Cíle',
    open: 'Otevřená otázka',
    other: 'Ostatní',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Pre-diagnostika {clientName && `- ${clientName}`}
          </DialogTitle>
          <DialogDescription>
            Odpovědi z vyplněného pre-diagnostického formuláře.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : answers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Žádné odpovědi nenalezeny
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedAnswers).map(([section, sectionAnswers]) => (
                <div key={section} className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Badge variant="secondary">
                      {sectionLabels[section] || section}
                    </Badge>
                  </h3>
                  <div className="space-y-2 pl-2">
                    {sectionAnswers.map((answer) => (
                      <div
                        key={answer.id}
                        className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-border/50 last:border-0"
                      >
                        <span className="text-sm text-muted-foreground shrink-0 sm:w-40">
                          {questionLabels[answer.field_key] || answer.field_key}:
                        </span>
                        <span className="text-sm text-foreground">
                          {formatValue(answer.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
