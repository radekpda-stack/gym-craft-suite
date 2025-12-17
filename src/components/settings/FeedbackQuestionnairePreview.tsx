import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FeedbackQuestionsConfig } from './FeedbackQuestionsEditor';
import { cn } from '@/lib/utils';

interface FeedbackQuestionnairePreviewProps {
  config: FeedbackQuestionsConfig;
}

export function FeedbackQuestionnairePreview({ config }: FeedbackQuestionnairePreviewProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    config.questions.forEach(q => {
      if (q.enabled) {
        initial[q.id] = q.defaultValue;
      }
    });
    return initial;
  });
  const [selectedPainArea, setSelectedPainArea] = useState<string>('');
  const [note, setNote] = useState('');

  const enabledQuestions = config.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);

  const enabledPainAreas = config.painAreas.filter(a => a.enabled);

  const painQuestion = config.questions.find(q => q.id === 'pain');
  const showPainAreas = painQuestion?.enabled && 
    painQuestion?.showPainAreas !== false && 
    (values['pain'] || 0) >= (painQuestion?.painAreaThreshold || 4);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Eye className="w-4 h-4" />
          Náhled dotazníku
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Zpětná vazba</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Náhled jak uvidí dotazník klient
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Training info placeholder */}
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground">Trénink</p>
            <p className="font-medium">17. 12. 2024 v 10:00</p>
          </div>

          {/* Questions */}
          {enabledQuestions.map((question) => (
            <div key={question.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{question.emoji}</span>
                <Label className="text-base font-medium">{question.label}</Label>
              </div>
              
              <div className="px-2">
                <Slider
                  value={[values[question.id] || question.defaultValue]}
                  onValueChange={([v]) => setValues(prev => ({ ...prev, [question.id]: v }))}
                  min={question.min}
                  max={question.max}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{question.minLabel}</span>
                  <span className="font-semibold text-foreground text-sm">
                    {values[question.id] || question.defaultValue}
                  </span>
                  <span>{question.maxLabel}</span>
                </div>
              </div>

              {/* Pain areas - show only for pain question when threshold reached */}
              {question.id === 'pain' && showPainAreas && enabledPainAreas.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-muted/50 space-y-3">
                  <Label className="text-sm font-medium">Kde cítíte bolest?</Label>
                  <RadioGroup
                    value={selectedPainArea}
                    onValueChange={setSelectedPainArea}
                    className="grid grid-cols-2 gap-2"
                  >
                    {enabledPainAreas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={area.id} id={`preview-${area.id}`} />
                        <Label 
                          htmlFor={`preview-${area.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {area.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>
          ))}

          {/* Note section */}
          {config.noteEnabled && (
            <div className="space-y-2">
              <Label className="text-base font-medium">
                💬 Poznámka (volitelná)
              </Label>
              <Textarea
                placeholder="Další komentáře k tréninku..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, config.noteMaxLength))}
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {note.length}/{config.noteMaxLength}
              </p>
            </div>
          )}

          {/* Submit button preview */}
          <Button className="w-full" disabled>
            Odeslat zpětnou vazbu
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Toto je pouze náhled. Skutečný formulář bude mít funkční odeslání.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
