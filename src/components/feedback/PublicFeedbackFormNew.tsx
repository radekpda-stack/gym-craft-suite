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

export function PublicFeedbackFormNew({ token }: PublicFeedbackFormNewProps) {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [painArea, setPainArea] = useState<string | null>(null);
  const [painAreaOther, setPainAreaOther] = useState('');
  const [note, setNote] = useState('');

  const questionsConfig = formData?.questionsConfig ?? DEFAULT_QUESTIONS_CONFIG;
  const enabledQuestions = questionsConfig.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);
  const enabledPainAreas = questionsConfig.painAreas.filter(a => a.enabled);
  const painQuestion = questionsConfig.questions.find(q => q.id === 'pain' && q.enabled);

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

  const handleSubmit = async () => {
    setStatus('submitting');

    try {
      const painThreshold = painQuestion?.painAreaThreshold ?? 4;
      const showPainArea = (values.pain ?? 1) >= painThreshold;

      const { data: result, error } = await supabase.functions.invoke('submit-public-feedback', {
        body: {
          token,
          values,
          pain_area: showPainArea ? painArea : undefined,
          pain_area_other: showPainArea && painArea === 'other' ? painAreaOther : undefined,
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
              
              {/* Conditional pain area selection */}
              {question.id === 'pain' && showPainAreas && (
                <Card className="mt-4 border-warning/50 bg-warning/5">
                  <CardContent className="pt-6">
                    <Label className="mb-3 block text-base font-medium">Kde to bolí?</Label>
                    <div className="flex flex-wrap gap-2">
                      {enabledPainAreas.map((area) => (
                        <Badge
                          key={area.id}
                          variant={painArea === area.id ? 'default' : 'outline'}
                          className={cn(
                            'cursor-pointer text-sm py-2 px-4 transition-all',
                            painArea === area.id 
                              ? 'bg-primary text-primary-foreground' 
                              : 'hover:bg-secondary'
                          )}
                          onClick={() => setPainArea(painArea === area.id ? null : area.id)}
                        >
                          {area.label}
                        </Badge>
                      ))}
                    </div>
                    {painArea === 'other' && (
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
