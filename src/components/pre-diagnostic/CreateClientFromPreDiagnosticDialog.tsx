import { useState, useEffect } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PreDiagnosticForm, useAssignPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';
import { useCreateClient } from '@/hooks/useClients';
import { useCreateMeasurement } from '@/hooks/useMeasurements';
import { toast } from 'sonner';

interface CreateClientFromPreDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PreDiagnosticForm;
}

// Helper to build comprehensive health restrictions from form answers
function buildHealthRestrictions(answerMap: Map<string, any>): string {
  const parts: string[] = [];
  
  const painAreas = answerMap.get('pain_areas');
  if (painAreas && Array.isArray(painAreas) && painAreas.length > 0) {
    const painInfo: string[] = [];
    painInfo.push(`Bolestivé oblasti: ${painAreas.join(', ')}`);
    const painType = answerMap.get('pain_type');
    const painDuration = answerMap.get('pain_duration');
    const painLimitation = answerMap.get('pain_limitation');
    if (painType) painInfo.push(`Typ: ${painType}`);
    if (painDuration) painInfo.push(`Trvání: ${painDuration}`);
    if (painLimitation) painInfo.push(`Omezení: ${painLimitation}`);
    parts.push(painInfo.join(' | '));
  }
  
  const injuryHistory = answerMap.get('injury_history');
  if (injuryHistory === true || injuryHistory === 'yes') {
    const injuries = answerMap.get('injury_details') || 'Ano (bez upřesnění)';
    parts.push(`Úrazy: ${injuries}`);
  }
  
  const surgeryHistory = answerMap.get('surgery_history');
  if (surgeryHistory === true || surgeryHistory === 'yes') {
    const surgeries = answerMap.get('surgery_details') || 'Ano (bez upřesnění)';
    parts.push(`Operace: ${surgeries}`);
  }
  
  const medications = answerMap.get('medications');
  const medicationDetails = answerMap.get('medication_details');
  if (medications === true || medications === 'yes' || medicationDetails) {
    parts.push(`Léky: ${medicationDetails || 'Ano (bez upřesnění)'}`);
  }
  
  const healthNotes = answerMap.get('health_notes');
  if (healthNotes) {
    parts.push(`Poznámky: ${healthNotes}`);
  }
  
  return parts.join('\n');
}

// Helper to build training goals from form answers
function buildTrainingGoals(answerMap: Map<string, any>): string[] {
  const goals: string[] = [];
  
  const mainGoal = answerMap.get('main_goal');
  if (mainGoal) goals.push(mainGoal);
  
  const goalsAnswer = answerMap.get('goals');
  if (goalsAnswer) {
    if (Array.isArray(goalsAnswer)) {
      goals.push(...goalsAnswer);
    } else {
      goals.push(goalsAnswer);
    }
  }
  
  return [...new Set(goals)];
}

export function CreateClientFromPreDiagnosticDialog({
  open,
  onOpenChange,
  form,
}: CreateClientFromPreDiagnosticDialogProps) {
  const [name, setName] = useState(form.client_name || '');
  const [email, setEmail] = useState(form.client_email || '');
  const [phone, setPhone] = useState('');

  const createClient = useCreateClient();
  const assignPreDiagnostic = useAssignPreDiagnostic();
  const createMeasurement = useCreateMeasurement();
  const { data: answers = [] } = usePreDiagnosticAnswers(form.id);

  const isLoading = createClient.isPending || assignPreDiagnostic.isPending;

  // Pre-fill from answers when available
  useEffect(() => {
    if (answers.length > 0) {
      const answerMap = new Map(answers.map(a => [a.field_key, a.value]));
      if (!name && answerMap.get('name')) setName(answerMap.get('name') as string);
      if (!email && answerMap.get('email')) setEmail(answerMap.get('email') as string);
      if (!phone && answerMap.get('phone')) setPhone(answerMap.get('phone') as string);
    }
  }, [answers]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Zadejte jméno klienta');
      return;
    }

    try {
      const answerMap = new Map(answers.map(a => [a.field_key, a.value]));
      
      // Build comprehensive client data from answers
      const healthRestrictions = buildHealthRestrictions(answerMap);
      const trainingGoals = buildTrainingGoals(answerMap);
      
      // Create client with all data from pre-diagnostic
      const newClient = await createClient.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        trainingGoals: trainingGoals,
        healthRestrictions: healthRestrictions,
        birthDate: (answerMap.get('birth_date') as string) || undefined,
        gender: (answerMap.get('gender') as 'male' | 'female') || undefined,
        occupation: String(answerMap.get('occupation') || answerMap.get('daily_activity_type') || '') || undefined,
        sleep_hours: Number(answerMap.get('sleep_hours') || answerMap.get('sleep_hours_avg')) || undefined,
        sports_history: String(answerMap.get('exercise_experience') || answerMap.get('sports_history') || '') || undefined,
        current_activities: Array.isArray(answerMap.get('current_activities')) 
          ? (answerMap.get('current_activities') as string[])
          : undefined,
        notes: String(answerMap.get('open_question') || '') || undefined,
      });

      // Create weight measurement if weight is provided
      const weight = answerMap.get('weight');
      if (weight && newClient.id) {
        const weightNum = parseFloat(weight as string);
        if (!isNaN(weightNum) && weightNum > 0) {
          try {
            await createMeasurement.mutateAsync({
              client_id: newClient.id,
              date: new Date().toISOString().split('T')[0],
              weight: weightNum,
              notes: 'Z pre-diagnostického formuláře',
            });
          } catch (e) {
            console.error('Error creating measurement:', e);
          }
        }
      }

      // Assign the pre-diagnostic form to the new client
      await assignPreDiagnostic.mutateAsync({
        formId: form.id,
        clientId: newClient.id,
      });

      toast.success(`Klient ${name} byl vytvořen s daty z pre-diagnostiky`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Nepodařilo se vytvořit klienta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Vytvořit klienta z pre-diagnostiky
          </DialogTitle>
          <DialogDescription>
            Vytvoří nového klienta se všemi daty z vyplněné pre-diagnostiky včetně váhy jako prvního měření.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Jméno *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Novák"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 123 456 789"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Vytvořit klienta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
