import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { BodyMapSelector } from './BodyMapSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PublicFeedbackFormNewProps {
  token: string;
}

interface FeedbackQuestion {
  id: string;
  type: 'slider';
  label: string;
  emoji: string;
  minLabel: string;
  maxLabel: string;
  min: number;
  max: number;
  defaultValue: number;
  enabled: boolean;
  order: number;
  helpText?: string;
  showPainAreas?: boolean;
  painAreaThreshold?: number;
}

interface PainArea {
  id: string;
  label: string;
  enabled: boolean;
}

interface FeedbackQuestionsConfig {
  questions: FeedbackQuestion[];
  painAreas: PainArea[];
  noteEnabled: boolean;
  noteMaxLength: number;
}

interface FormData {
  clientName: string;
  trainingDate: string | null;
  trainingNotes: string | null;
  expiresAt: string;
  questionsConfig: FeedbackQuestionsConfig | null;
}

type FormStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'completed';

// Default help texts for core questions
const DEFAULT_HELP_TEXTS: Record<string, string> = {
  soreness: 'Zpožděná svalová bolestivost (DOMS) - pocit ztuhlosti a citlivosti ve svalech, který se objevuje 24-72 hodin po tréninku. Je normální a ukazuje na zatížení svalů.',
  body_feel: 'Jak se celkově cítíte fyzicky? Ztuhlost, lehkost, svěžest nebo naopak těžkost a únava v těle.',
  energy: 'Vaše celková úroveň energie během dne - zda se cítíte unavený, ospalý nebo naopak plný síly a elánu.',
  pain: 'Ostrá, bodavá nebo tupá bolest v kloubech, šlachách nebo svalech - NE běžná svalovka po tréninku. Pokud máte bolest, vyberte kde.',
  session_fit: 'Hodnotí, jak dobře trénink odpovídal vaší aktuální kondici, náladě a očekávání. Byl přiměřený, nebo příliš lehký/těžký?',
  difficulty: 'Subjektivní pocit náročnosti - jak moc vás trénink vyčerpal fyzicky. 1 = téměř bez námahy, 10 = úplné vyčerpání.',
  fun: 'Jak moc vás trénink bavil? Cítili jste motivaci a radost z pohybu, nebo to bylo spíše utrpení?',
};

const DEFAULT_QUESTIONS_CONFIG: FeedbackQuestionsConfig = {
  questions: [
    { id: 'soreness', type: 'slider', label: 'Svalovka', emoji: '💪', minLabel: 'Žádná', maxLabel: 'Extrémní', min: 1, max: 10, defaultValue: 5, enabled: true, order: 0, helpText: DEFAULT_HELP_TEXTS.soreness },
    { id: 'body_feel', type: 'slider', label: 'Celkový pocit v těle', emoji: '🧘', minLabel: 'Špatně', maxLabel: 'Výborně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 1, helpText: DEFAULT_HELP_TEXTS.body_feel },
    { id: 'energy', type: 'slider', label: 'Energie', emoji: '⚡', minLabel: 'Vyčerpaný', maxLabel: 'Plný energie', min: 1, max: 10, defaultValue: 5, enabled: true, order: 2, helpText: DEFAULT_HELP_TEXTS.energy },
    { id: 'pain', type: 'slider', label: 'Bolest (ne jen svalovka)', emoji: '🩹', minLabel: 'Žádná', maxLabel: 'Silná', min: 1, max: 10, defaultValue: 1, enabled: true, order: 3, showPainAreas: true, painAreaThreshold: 4, helpText: DEFAULT_HELP_TEXTS.pain },
    { id: 'session_fit', type: 'slider', label: 'Jak sedl trénink', emoji: '🎯', minLabel: 'Vůbec', maxLabel: 'Perfektně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 4, helpText: DEFAULT_HELP_TEXTS.session_fit },
    { id: 'difficulty', type: 'slider', label: 'Jak těžký byl trénink', emoji: '🏋️', minLabel: 'Lehký', maxLabel: 'Velmi těžký', min: 1, max: 10, defaultValue: 5, enabled: true, order: 5, helpText: DEFAULT_HELP_TEXTS.difficulty },
    { id: 'fun', type: 'slider', label: 'Jak moc to bavilo', emoji: '😊', minLabel: 'Vůbec', maxLabel: 'Maximálně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 6, helpText: DEFAULT_HELP_TEXTS.fun },
  ],
  painAreas: [
    { id: 'knee', label: 'Koleno', enabled: true },
    { id: 'back', label: 'Záda', enabled: true },
    { id: 'shoulder', label: 'Rameno', enabled: true },
    { id: 'hip', label: 'Kyčel', enabled: true },
    { id: 'ankle', label: 'Kotník', enabled: true },
    { id: 'wrist', label: 'Zápěstí', enabled: true },
    { id: 'neck', label: 'Krk', enabled: true },
    { id: 'other', label: 'Jiné', enabled: true },
  ],
  noteEnabled: true,
  noteMaxLength: 200,
};

// Import bilateral areas from BodyMapSelector
import { BILATERAL_AREAS } from './BodyMapSelector';

type PainSide = 'left' | 'right' | 'both';

export function PublicFeedbackFormNew({ token }: PublicFeedbackFormNewProps) {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [painAreaSides, setPainAreaSides] = useState<Record<string, PainSide>>({});
  const [painAreaNotes, setPainAreaNotes] = useState<Record<string, string>>({});
  const [painAreaIntensities, setPainAreaIntensities] = useState<Record<string, number>>({});
  const [painAreaOther, setPainAreaOther] = useState('');
  const [note, setNote] = useState('');

  const questionsConfig = formData?.questionsConfig ?? DEFAULT_QUESTIONS_CONFIG;
  const enabledQuestions = questionsConfig.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);
  const enabledPainAreas = questionsConfig.painAreas.filter(a => a.enabled);
  const painQuestion = questionsConfig.questions.find(q => q.id === 'pain' && q.enabled);

  // Get bilateral areas that need side selection
  const bilateralAreasSelected = painAreas.filter(area => BILATERAL_AREAS.includes(area));

  useEffect(() => {
    loadFormData();
  }, [token]);

  // Initialize values when config is loaded
  useEffect(() => {
    if (questionsConfig && Object.keys(values).length === 0) {
      const initialValues: Record<string, number> = {};
      questionsConfig.questions.forEach(q => {
        initialValues[q.id] = q.defaultValue;
      });
      setValues(initialValues);
    }
  }, [questionsConfig]);

  const loadFormData = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('get-public-feedback-form', {
        body: { token },
      });

      if (error) {
        console.error('Error loading form:', error);
        setErrorMessage('Chyba při načítání formuláře');
        setStatus('error');
        return;
      }

      if (result?.code === 'EXPIRED') {
        setStatus('expired');
        return;
      }
      
      if (result?.code === 'ALREADY_COMPLETED') {
        setStatus('completed');
        return;
      }
      
      if (result?.error) {
        setErrorMessage(result.error || 'Neplatný odkaz');
        setStatus('error');
        return;
      }

      setFormData(result.data);
      setStatus('ready');
    } catch (error) {
      console.error('Error loading form:', error);
      setErrorMessage('Chyba při načítání formuláře');
      setStatus('error');
    }
  };

  // Handle pain areas change from BodyMapSelector
  const handlePainAreasChange = (areas: string[]) => {
    setPainAreas(areas);
    // Remove sides, notes, and intensities for areas that are no longer selected
    const newSides = { ...painAreaSides };
    const newNotes = { ...painAreaNotes };
    const newIntensities = { ...painAreaIntensities };
    Object.keys(newSides).forEach(area => {
      if (!areas.includes(area)) {
        delete newSides[area];
      }
    });
    Object.keys(newNotes).forEach(area => {
      if (!areas.includes(area)) {
        delete newNotes[area];
      }
    });
    Object.keys(newIntensities).forEach(area => {
      if (!areas.includes(area)) {
        delete newIntensities[area];
      }
    });
    setPainAreaSides(newSides);
    setPainAreaNotes(newNotes);
    setPainAreaIntensities(newIntensities);
  };

  // Handle intensity change for a specific area
  const handleIntensityChange = (area: string, intensity: number) => {
    setPainAreaIntensities(prev => ({ ...prev, [area]: intensity }));
  };

  // Handle side selection for a specific area
  const handleSideSelect = (area: string, side: PainSide) => {
    setPainAreaSides(prev => ({ ...prev, [area]: side }));
  };

  // Handle note change for a specific area
  const handleAreaNoteChange = (area: string, noteText: string) => {
    setPainAreaNotes(prev => ({ ...prev, [area]: noteText }));
  };

  const handleSubmit = async () => {
    setStatus('submitting');

    try {
      const painThreshold = painQuestion?.painAreaThreshold ?? 4;
      const showPainArea = (values.pain ?? 1) >= painThreshold;

      // Build pain areas array with sides, notes, and intensities
      const painAreasData = showPainArea ? painAreas.map(area => {
        const side = painAreaSides[area];
        const areaNote = painAreaNotes[area];
        const intensity = painAreaIntensities[area] ?? 5;
        let areaKey = area;
        if (BILATERAL_AREAS.includes(area) && side) {
          areaKey = `${area}_${side}`;
        }
        return {
          area: areaKey,
          note: areaNote || undefined,
          intensity,
        };
      }) : [];

      const painAreasWithSides = painAreasData.map(p => p.area);

      const { data: result, error } = await supabase.functions.invoke('submit-public-feedback', {
        body: {
          token,
          values,
          pain_areas: painAreasWithSides.length > 0 ? painAreasWithSides : undefined,
          pain_area: painAreasWithSides.length > 0 ? painAreasWithSides.join(', ') : undefined, // Keep for backward compatibility
          pain_area_notes: painAreasData.filter(p => p.note).length > 0 
            ? Object.fromEntries(painAreasData.filter(p => p.note).map(p => [p.area, p.note]))
            : undefined,
          pain_area_intensities: painAreasData.length > 0
            ? Object.fromEntries(painAreasData.map(p => [p.area, p.intensity]))
            : undefined,
          pain_area_other: showPainArea && painAreas.includes('other') ? painAreaOther : undefined,
          note: note || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Chyba při odesílání');
      }

      if (result?.error) {
        throw new Error(result.error || 'Chyba při odesílání');
      }

      setStatus('success');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      setErrorMessage(error.message || 'Chyba při odesílání');
      setStatus('error');
    }
  };

  const renderSlider = (question: FeedbackQuestion) => {
    const value = values[question.id] ?? question.defaultValue;
    // Use custom helpText or fall back to default for core questions
    const helpText = question.helpText || DEFAULT_HELP_TEXTS[question.id];
    
    return (
      <Card key={question.id}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">
                  {question.emoji && <span className="mr-2">{question.emoji}</span>}
                  {question.label}
                </Label>
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
              <span className="text-2xl font-bold text-primary">{value}</span>
            </div>
            <Slider
              value={[value]}
              onValueChange={([v]) => setValues(prev => ({ ...prev, [question.id]: v }))}
              min={question.min}
              max={question.max}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{question.minLabel}</span>
              <span>{question.maxLabel}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Načítám formulář...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Chyba</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Platnost vypršela</h2>
            <p className="text-muted-foreground">
              Platnost tohoto odkazu již vypršela. Kontaktujte svého trenéra pro nový odkaz.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already completed state
  if (status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Již vyplněno</h2>
            <p className="text-muted-foreground">
              Zpětná vazba pro tento trénink již byla odeslána. Děkujeme!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Děkujeme!</h2>
            <p className="text-muted-foreground">
              Vaše zpětná vazba byla úspěšně odeslána. Trenér ji použije pro optimalizaci vašeho tréninku.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const painThreshold = painQuestion?.painAreaThreshold ?? 4;
  const showPainAreas = painQuestion && (values.pain ?? 1) >= painThreshold;

  // Form state
  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Jak ti je po včerejším tréninku?</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Díky tomu příště nastavím trénink přesněji. (1 minuta)
            </p>
          </CardHeader>
          {formData?.trainingDate && (
            <CardContent className="pt-0">
              <div className="p-3 rounded-lg bg-secondary/50 border text-sm text-center">
                <span className="text-muted-foreground">Trénink:</span>{' '}
                <span className="font-medium">
                  {format(new Date(formData.trainingDate), 'd.M.yyyy HH:mm', { locale: cs })}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Dynamic Questions */}
        <div className="space-y-4">
          {enabledQuestions.map((question) => (
            <div key={question.id}>
              {renderSlider(question)}
              
              {/* Conditional pain area selection with body map */}
              {question.id === 'pain' && showPainAreas && (
                <Card className="mt-4 border-warning/50 bg-warning/5">
                  <CardContent className="pt-6">
                    <Label className="mb-4 block text-base font-medium text-center">
                      Kde to bolí? Klikni na oblasti (můžeš vybrat více)
                    </Label>
                    
                    <BodyMapSelector
                      selectedAreas={painAreas}
                      onAreasChange={handlePainAreasChange}
                      intensities={painAreaIntensities}
                      onIntensityChange={handleIntensityChange}
                      language="cs"
                    />
                    
                    {/* Side selection for each bilateral area */}
                    {bilateralAreasSelected.length > 0 && (
                      <div className="mt-4 space-y-3">
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
                                  <Badge
                                    key={side.id}
                                    variant={painAreaSides[area] === side.id ? 'default' : 'outline'}
                                    className={cn(
                                      'cursor-pointer text-sm py-2 px-4 transition-all',
                                      painAreaSides[area] === side.id 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'hover:bg-secondary'
                                    )}
                                    onClick={() => handleSideSelect(area, side.id as PainSide)}
                                  >
                                    {side.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Notes for each selected area */}
                    {painAreas.filter(a => a !== 'other').length > 0 && (
                      <div className="mt-4 space-y-3">
                        <Label className="block text-sm font-medium text-center text-muted-foreground">
                          Poznámky k vybraným oblastem (volitelné)
                        </Label>
                        {painAreas.filter(a => a !== 'other').map(area => {
                          const areaLabels: Record<string, string> = {
                            knee: 'Koleno', shoulder: 'Rameno', hip: 'Kyčel', 
                            ankle: 'Kotník', wrist: 'Zápěstí', elbow: 'Loket',
                            neck: 'Krk', chest: 'Hrudník', upper_back: 'Horní záda',
                            lower_back: 'Dolní záda', glutes: 'Hýždě', hamstring: 'Zadní stehno',
                            calf: 'Lýtko'
                          };
                          const side = painAreaSides[area];
                          const sideLabel = side === 'left' ? ' (levá)' : side === 'right' ? ' (pravá)' : side === 'both' ? ' (obě)' : '';
                          return (
                            <div key={`note-${area}`} className="relative">
                              <Textarea
                                placeholder={`${areaLabels[area] || area}${sideLabel} - popište bolest...`}
                                value={painAreaNotes[area] || ''}
                                onChange={(e) => handleAreaNoteChange(area, e.target.value)}
                                className="text-sm"
                                maxLength={100}
                                rows={2}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {painAreas.includes('other') && (
                      <Textarea
                        placeholder="Upřesni, kde to bolí..."
                        value={painAreaOther}
                        onChange={(e) => setPainAreaOther(e.target.value)}
                        className="mt-3"
                        maxLength={100}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {/* Optional note */}
          {questionsConfig.noteEnabled && (
            <Card>
              <CardContent className="pt-6">
                <Label className="mb-3 block text-base font-medium">
                  📝 Poznámka (volitelné)
                </Label>
                <Textarea
                  placeholder="Cokoliv dalšího..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={questionsConfig.noteMaxLength}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {note.length}/{questionsConfig.noteMaxLength}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Submit Button */}
        <Button
          className="w-full mt-6 h-14 text-lg font-semibold"
          size="lg"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Odesílám...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Odeslat zpětnou vazbu
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vaše odpovědi jsou důvěrné a pomohou zlepšit váš trénink.
        </p>
      </div>
    </div>
  );
}
