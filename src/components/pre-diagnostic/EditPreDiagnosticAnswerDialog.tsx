import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUpdatePreDiagnosticAnswer } from '@/hooks/usePreDiagnosticForms';

interface PreDiagnosticAnswer {
  id: string;
  field_key: string;
  value: any;
}

interface EditPreDiagnosticAnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answer: PreDiagnosticAnswer | null;
  fieldLabel: string;
}

// Fields that should use number input
const NUMBER_FIELDS = ['age', 'height', 'weight', 'sleep_hours_avg'];

// Fields that should use boolean (switch)
const BOOLEAN_FIELDS = ['has_pain', 'injury_history', 'surgery_history', 'medications'];

// Fields that should use textarea
const TEXTAREA_FIELDS = [
  'current_activities', 'priorities', 'goals', 'expectations',
  'pain_areas', 'injury_details', 'surgery_details', 'medication_details',
  'health_notes', 'open_question'
];

function getInputType(fieldKey: string, value: any): 'number' | 'boolean' | 'textarea' | 'text' {
  if (NUMBER_FIELDS.includes(fieldKey)) return 'number';
  if (BOOLEAN_FIELDS.includes(fieldKey)) return 'boolean';
  if (TEXTAREA_FIELDS.includes(fieldKey)) return 'textarea';
  
  // Auto-detect based on value type
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'textarea';
  if (typeof value === 'string' && value.length > 50) return 'textarea';
  
  return 'text';
}

function formatValueForEdit(value: any): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function parseEditedValue(value: string, inputType: 'number' | 'boolean' | 'textarea' | 'text', originalValue: any): any {
  if (inputType === 'number') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  
  if (inputType === 'textarea' && Array.isArray(originalValue)) {
    // Parse comma-separated values back to array
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  
  return value;
}

export function EditPreDiagnosticAnswerDialog({
  open,
  onOpenChange,
  answer,
  fieldLabel,
}: EditPreDiagnosticAnswerDialogProps) {
  const [editValue, setEditValue] = useState<string>('');
  const [boolValue, setBoolValue] = useState<boolean>(false);
  const updateAnswer = useUpdatePreDiagnosticAnswer();

  const inputType = answer ? getInputType(answer.field_key, answer.value) : 'text';

  useEffect(() => {
    if (answer) {
      if (inputType === 'boolean') {
        setBoolValue(Boolean(answer.value));
      } else {
        setEditValue(formatValueForEdit(answer.value));
      }
    }
  }, [answer, inputType]);

  const handleSave = async () => {
    if (!answer) return;

    let finalValue: any;
    if (inputType === 'boolean') {
      finalValue = boolValue;
    } else {
      finalValue = parseEditedValue(editValue, inputType, answer.value);
    }

    try {
      await updateAnswer.mutateAsync({
        answerId: answer.id,
        value: finalValue,
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit: {fieldLabel}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {inputType === 'boolean' ? (
            <div className="flex items-center justify-between">
              <Label htmlFor="bool-value" className="text-sm">
                {fieldLabel}
              </Label>
              <Switch
                id="bool-value"
                checked={boolValue}
                onCheckedChange={setBoolValue}
              />
            </div>
          ) : inputType === 'textarea' ? (
            <div className="space-y-2">
              <Label htmlFor="text-value" className="text-sm text-muted-foreground">
                {Array.isArray(answer?.value) ? 'Hodnoty oddělené čárkou' : 'Hodnota'}
              </Label>
              <Textarea
                id="text-value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          ) : inputType === 'number' ? (
            <div className="space-y-2">
              <Label htmlFor="num-value" className="text-sm text-muted-foreground">
                Hodnota
              </Label>
              <Input
                id="num-value"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="str-value" className="text-sm text-muted-foreground">
                Hodnota
              </Label>
              <Input
                id="str-value"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSave} disabled={updateAnswer.isPending}>
            {updateAnswer.isPending ? 'Ukládám...' : 'Uložit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
