import { useState } from 'react';
import { Eye, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FeedbackQuestionsConfig } from './FeedbackQuestionsEditor';
import { cn } from '@/lib/utils';
import { BodyMapSelector } from '@/components/feedback/BodyMapSelector';

// Default help texts for core questions (same as in PublicFeedbackFormNew)
const DEFAULT_HELP_TEXTS: Record<string, string> = {
  soreness: 'Zpožděná svalová bolestivost (DOMS) - pocit ztuhlosti a citlivosti ve svalech, který se objevuje 24-72 hodin po tréninku. Je normální a ukazuje na zatížení svalů.',
  body_feel: 'Jak se celkově cítíte fyzicky? Ztuhlost, lehkost, svěžest nebo naopak těžkost a únava v těle.',
  energy: 'Vaše celková úroveň energie během dne - zda se cítíte unavený, ospalý nebo naopak plný síly a elánu.',
  pain: 'Ostrá, bodavá nebo tupá bolest v kloubech, šlachách nebo svalech - NE běžná svalovka po tréninku. Pokud máte bolest, vyberte kde.',
  session_fit: 'Hodnotí, jak dobře trénink odpovídal vaší aktuální kondici, náladě a očekávání. Byl přiměřený, nebo příliš lehký/těžký?',
  difficulty: 'Subjektivní pocit náročnosti - jak moc vás trénink vyčerpal fyzicky. 1 = téměř bez námahy, 10 = úplné vyčerpání.',
  fun: 'Jak moc vás trénink bavil? Cítili jste motivaci a radost z pohybu, nebo to bylo spíše utrpení?',
};

interface FeedbackQuestionnairePreviewProps {
  config: FeedbackQuestionsConfig;
}

// Import bilateral areas from BodyMapSelector
import { BILATERAL_AREAS } from '@/components/feedback/BodyMapSelector';

type PainSide = 'left' | 'right' | 'both';

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
  const [selectedPainAreas, setSelectedPainAreas] = useState<string[]>([]);
  const [painAreaSides, setPainAreaSides] = useState<Record<string, PainSide>>({});
  const [note, setNote] = useState('');

  const enabledQuestions = config.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);

  const enabledPainAreas = config.painAreas.filter(a => a.enabled);

  const painQuestion = config.questions.find(q => q.id === 'pain');
  const showPainAreas = painQuestion?.enabled && 
    painQuestion?.showPainAreas !== false && 
    (values['pain'] || 0) >= (painQuestion?.painAreaThreshold || 4);
  
  const bilateralAreasSelected = selectedPainAreas.filter(area => BILATERAL_AREAS.includes(area));
  
  const handlePainAreasChange = (areas: string[]) => {
    setSelectedPainAreas(areas);
    const newSides = { ...painAreaSides };
    Object.keys(newSides).forEach(area => {
      if (!areas.includes(area)) delete newSides[area];
    });
    setPainAreaSides(newSides);
  };

  const handleSideSelect = (area: string, side: PainSide) => {
    setPainAreaSides(prev => ({ ...prev, [area]: side }));
  };

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
          {enabledQuestions.map((question) => {
            const helpText = question.helpText || DEFAULT_HELP_TEXTS[question.id];
            
            return (
              <div key={question.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{question.emoji}</span>
                  <Label className="text-base font-medium">{question.label}</Label>
                  {helpText && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button 
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Nápověda"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        side="top" 
                        className="max-w-[280px] text-sm"
                        sideOffset={8}
                      >
                        {helpText}
                      </PopoverContent>
                    </Popover>
                  )}
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

                {question.id === 'pain' && showPainAreas && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/50 space-y-3">
                    <Label className="text-sm font-medium text-center block">
                      Kde cítíte bolest? Klikněte na oblasti (můžete vybrat více)
                    </Label>
                    
                    <BodyMapSelector
                      selectedAreas={selectedPainAreas}
                      onAreasChange={handlePainAreasChange}
                      language="cs"
                    />
                    
                    {/* Side selection for each bilateral area */}
                    {bilateralAreasSelected.length > 0 && (
                      <div className="space-y-2">
                        {bilateralAreasSelected.map(area => {
                          const areaLabels: Record<string, string> = {
                            knee: 'Koleno', shoulder: 'Rameno', hip: 'Kyčel', 
                            ankle: 'Kotník', wrist: 'Zápěstí', elbow: 'Loket'
                          };
                          return (
                            <div key={area} className="p-3 rounded-lg bg-background/50 border">
                              <Label className="mb-2 block text-sm font-medium text-center">
                                {areaLabels[area]} - která strana?
                              </Label>
                              <div className="flex gap-2 justify-center">
                                {[
                                  { id: 'left', label: 'Levá' },
                                  { id: 'right', label: 'Pravá' },
                                  { id: 'both', label: 'Obě' },
                                ].map((side) => (
                                  <button
                                    key={side.id}
                                    type="button"
                                    className={cn(
                                      'py-2 px-4 text-sm rounded-md border transition-colors',
                                      painAreaSides[area] === side.id 
                                        ? 'bg-primary text-primary-foreground border-primary' 
                                        : 'bg-background hover:bg-secondary border-border'
                                    )}
                                    onClick={() => handleSideSelect(area, side.id as PainSide)}
                                  >
                                    {side.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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
