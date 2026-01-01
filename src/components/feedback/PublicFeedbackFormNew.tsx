import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  User,
  XCircle,
} from 'lucide-react';
import { BodyPainSelector, PainSelection } from './BodyPainSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { trackEvent, startTimedEvent } from '@/lib/analytics';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  clientGender: 'male' | 'female' | null;
  trainingDate: string | null;
  trainingNotes: string | null;
  trainerName: string | null;
  expiresAt: string;
  questionsConfig: FeedbackQuestionsConfig | null;
}

type FormStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'completed' | 'rejected';

// Mandatory questions that are always visible (Master Prompt requirement)
const MANDATORY_QUESTION_IDS = ['soreness', 'pain', 'energy', 'difficulty'];

// Optional questions shown in collapsible section
const OPTIONAL_QUESTION_IDS = ['fun', 'session_fit', 'body_feel'];

// Default help texts for core questions
const DEFAULT_HELP_TEXTS: Record<string, string> = {
  soreness: 'Zpožděná svalová bolestivost (DOMS) - pocit ztuhlosti a citlivosti ve svalech, který se objevuje 24-72 hodin po tréninku. Je normální a ukazuje na zatížení svalů.',
  body_feel: 'Jak se celkově cítíte fyzicky? Ztuhlost, lehkost, svěžest nebo naopak těžkost a únava v těle.',
  energy: 'Vaše celková úroveň energie během dne - zda se cítíte unavený, ospalý nebo naopak plný síly a elánu.',
  pain: 'Ostrá, bodavá nebo tupá bolest v kloubech, šlachách nebo svalech - NE běžná svalová bolest po tréninku. Pokud máte bolest, vyberte kde.',
  session_fit: 'Hodnotí, jak dobře trénink odpovídal vaší aktuální kondici, náladě a očekávání. Byl přiměřený, nebo příliš lehký/těžký?',
  difficulty: '1-3: rezerva, mohl/a bych pokračovat | 4-6: náročné, ale kontrolované | 7-8: na hraně, ke konci těžké | 9-10: maximum/přepálené',
  fun: 'Jak moc vás trénink bavil? Cítili jste motivaci a radost z pohybu, nebo to bylo spíše utrpení?',
};

const DEFAULT_QUESTIONS_CONFIG: FeedbackQuestionsConfig = {
  questions: [
    { id: 'soreness', type: 'slider', label: 'Svalová bolest', emoji: '💪', minLabel: 'Žádná', maxLabel: 'Extrémní', min: 1, max: 10, defaultValue: 5, enabled: true, order: 0, helpText: DEFAULT_HELP_TEXTS.soreness },
    { id: 'body_feel', type: 'slider', label: 'Celkový pocit v těle', emoji: '🧘', minLabel: 'Špatně', maxLabel: 'Výborně', min: 1, max: 10, defaultValue: 5, enabled: true, order: 1, helpText: DEFAULT_HELP_TEXTS.body_feel },
    { id: 'energy', type: 'slider', label: 'Energie', emoji: '⚡', minLabel: 'Vyčerpaný', maxLabel: 'Plný energie', min: 1, max: 10, defaultValue: 5, enabled: true, order: 2, helpText: DEFAULT_HELP_TEXTS.energy },
    { id: 'pain', type: 'slider', label: 'Bolest (mimo svalovou)', emoji: '🩹', minLabel: 'Žádná', maxLabel: 'Silná', min: 1, max: 10, defaultValue: 1, enabled: true, order: 3, showPainAreas: true, painAreaThreshold: 4, helpText: DEFAULT_HELP_TEXTS.pain },
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

// Bilateral areas that need side selection
const BILATERAL_AREAS = ['knee', 'shoulder', 'hip', 'ankle', 'wrist', 'elbow'];

export function PublicFeedbackFormNew({ token }: PublicFeedbackFormNewProps) {
  const [status, setStatus] = useState<FormStatus>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [painSelections, setPainSelections] = useState<PainSelection[]>([]);
  const [painAreaOther, setPainAreaOther] = useState('');
  const [painType, setPainType] = useState<'muscle' | 'joint' | 'tendon' | null>(null);
  const [sleepAfter, setSleepAfter] = useState<'poor' | 'average' | 'good' | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [note, setNote] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Timing for form completion
  const formOpenTime = useRef<number>(Date.now());
  const hasTrackedOpen = useRef(false);

  const questionsConfig = formData?.questionsConfig ?? DEFAULT_QUESTIONS_CONFIG;
  
  // Split questions into mandatory and optional
  const enabledQuestions = questionsConfig.questions
    .filter(q => q.enabled)
    .sort((a, b) => a.order - b.order);
  
  const mandatoryQuestions = enabledQuestions.filter(q => MANDATORY_QUESTION_IDS.includes(q.id));
  const optionalQuestions = enabledQuestions.filter(q => OPTIONAL_QUESTION_IDS.includes(q.id));
  
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
    console.log('Loading form data for token:', token);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-public-feedback-form', {
        body: { token },
      });

      console.log('Edge function response:', { result, error });

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

      if (result?.code === 'REJECTED') {
        setStatus('rejected');
        return;
      }
      
      if (result?.error) {
        console.error('Form error:', result.error, result.code);
        setErrorMessage(result.error || 'Neplatný odkaz');
        setStatus('error');
        return;
      }

      setFormData(result.data);
      setStatus('ready');
      
      // Track form open event (only once)
      if (!hasTrackedOpen.current) {
        hasTrackedOpen.current = true;
        formOpenTime.current = Date.now();
        trackEvent('feedback_form_open', 'feedback', {
          metadata: {
            token_hash: token.substring(0, 8),
            has_training_date: !!result.data?.trainingDate,
          }
        });
      }
    } catch (error) {
      console.error('Error loading form:', error);
      setErrorMessage('Chyba při načítání formuláře');
      setStatus('error');
    }
  };

  // Handle pain selections change from BodyPainSelector
  const handlePainSelectionsChange = (selections: PainSelection[]) => {
    setPainSelections(selections);
  };

  // Handle rejection - "Tohle nejsem já"
  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('reject-feedback-form', {
        body: { token },
      });

      if (error) {
        console.error('Error rejecting form:', error);
        setErrorMessage('Chyba při odmítání formuláře');
        setStatus('error');
        return;
      }

      if (result?.error) {
        setErrorMessage(result.error);
        setStatus('error');
        return;
      }

      setStatus('rejected');
    } catch (error) {
      console.error('Error rejecting form:', error);
      setErrorMessage('Chyba při odmítání formuláře');
      setStatus('error');
    } finally {
      setIsRejecting(false);
      setShowRejectConfirm(false);
    }
  };

  const handleSubmit = async () => {
    setStatus('submitting');
    const completionTimeMs = Date.now() - formOpenTime.current;
    const questionsCount = questionsConfig.questions.filter(q => q.enabled).length;

    try {
      const painThreshold = painQuestion?.painAreaThreshold ?? 4;
      const showPainArea = (values.pain ?? 1) >= painThreshold;

      // Build pain areas with extended data (intensity + isNew)
      const painAreasData = showPainArea ? painSelections.map(sel => {
        let areaKey = sel.area;
        if (BILATERAL_AREAS.includes(sel.area) && sel.side) {
          areaKey = `${sel.area}_${sel.side}`;
        }
        return {
          area: areaKey,
          intensity: sel.intensity,
          isNew: sel.isNew ?? true,
        };
      }) : [];

      const painAreasWithSides = painAreasData.map(p => p.area);

      // Build pain_area_intensities with isNew flag
      const painAreaIntensities = painAreasData.length > 0
        ? Object.fromEntries(painAreasData.map(p => [p.area, { intensity: p.intensity, isNew: p.isNew }]))
        : undefined;

      const { data: result, error } = await supabase.functions.invoke('submit-public-feedback', {
        body: {
          token,
          values,
          pain_areas: painAreasWithSides.length > 0 ? painAreasWithSides : undefined,
          pain_area: painAreasWithSides.length > 0 ? painAreasWithSides.join(', ') : undefined,
          pain_area_intensities: painAreaIntensities,
          pain_area_other: showPainArea && painSelections.some(s => s.area === 'other') ? painAreaOther : undefined,
          pain_type: showPainArea && painType ? painType : undefined,
          sleep_after: sleepAfter || undefined,
          sleep_hours: sleepHours,
          note: note || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Chyba při odesílání');
      }

      if (result?.error) {
        throw new Error(result.error || 'Chyba při odesílání');
      }

      // Track successful submission
      trackEvent('feedback_form_submit', 'feedback', {
        metadata: {
          token_hash: token.substring(0, 8),
          fields_count: questionsCount,
          has_pain: showPainArea,
          has_note: !!note,
        },
        duration_ms: completionTimeMs,
        success: true,
      });

      setStatus('success');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      
      // Track submission error
      trackEvent('feedback_form_submit_error', 'feedback', {
        metadata: {
          token_hash: token.substring(0, 8),
          fields_count: questionsCount,
        },
        duration_ms: completionTimeMs,
        success: false,
        error_message: error.message || 'Unknown error',
      });
      
      setErrorMessage(error.message || 'Chyba při odesílání');
      setStatus('error');
    }
  };

  const renderSlider = (question: FeedbackQuestion) => {
    const value = values[question.id] ?? question.defaultValue;
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
            
            {/* Difficulty scale anchoring */}
            {question.id === 'difficulty' && (
              <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground mt-2 border-t pt-2">
                <div className="text-center">
                  <span className="font-medium">1-3</span>
                  <p>rezerva</p>
                </div>
                <div className="text-center">
                  <span className="font-medium">4-6</span>
                  <p>kontrola</p>
                </div>
                <div className="text-center">
                  <span className="font-medium">7-8</span>
                  <p>na hraně</p>
                </div>
                <div className="text-center">
                  <span className="font-medium">9-10</span>
                  <p>maximum</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="public-page flex items-center justify-center">
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
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card max-w-md w-full">
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
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card max-w-md w-full">
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
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Již vyplněno</h2>
            <p className="text-muted-foreground">
              Zpětná vazba pro tento trénink již byla odeslána. Děkujeme!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected state
  if (status === 'rejected') {
    return (
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-warning" />
            <h2 className="text-xl font-semibold mb-2">Děkujeme za upozornění</h2>
            <p className="text-muted-foreground">
              Formulář byl označen jako nesprávně doručený. Váš trenér bude informován.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="public-page flex items-center justify-center p-4">
        <Card className="public-card max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
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
    <div className="public-page py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header with explanation */}
        <Card className="public-card mb-6">
          <CardHeader className="text-center pb-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Krátká zpětná vazba po tréninku</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Intro explanation text */}
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>
                Tento formulář slouží trenérovi k lepšímu pochopení,
                jak tvé tělo reagovalo na poslední trénink.
              </p>
              <p>
                Odpovědi pomáhají přizpůsobit další tréninky tak,
                aby byly bezpečné, efektivní a dlouhodobě udržitelné.
              </p>
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 mt-2">
                <Clock className="w-3.5 h-3.5" />
                Vyplnění zabere přibližně 1–2 minuty
              </p>
            </div>

            {/* Client and Training Info - Double-check header */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  Feedback pro: {formData?.clientName || 'Klient'}
                </span>
              </div>
              {formData?.trainingDate && (
                <p className="text-sm text-center text-muted-foreground">
                  Trénink: {format(new Date(formData.trainingDate), "EEEE d. MMMM yyyy 'v' HH:mm", { locale: cs })}
                </p>
              )}
              {formData?.trainerName && (
                <p className="text-xs text-center text-muted-foreground">
                  Trenér: {formData.trainerName}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reject confirmation dialog */}
        <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tohle nejste vy?</AlertDialogTitle>
              <AlertDialogDescription>
                Pokud jste obdrželi tento formulář omylem nebo patří někomu jinému, 
                dejte nám vědět. Váš trenér bude informován.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRejecting}>Zrušit</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleReject} 
                disabled={isRejecting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ano, nejsem to já
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* MANDATORY Questions - Always visible */}
        <div className="space-y-4">
          {mandatoryQuestions.map((question) => (
            <div key={question.id}>
              {renderSlider(question)}
              
              {/* Conditional pain area selection with pain type switch */}
              {question.id === 'pain' && showPainAreas && (
                <Card className="mt-4 border-border bg-secondary/30">
                  <CardContent className="pt-6 space-y-4">
                    {/* Pain Type Switch - Extended with tendon option */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Je tato bolest spíš:</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPainType('muscle')}
                          className={cn(
                            "py-3 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                            painType === 'muscle'
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:border-muted-foreground"
                          )}
                        >
                          💪 Svalová bolest
                        </button>
                        <button
                          type="button"
                          onClick={() => setPainType('joint')}
                          className={cn(
                            "py-3 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                            painType === 'joint'
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:border-muted-foreground"
                          )}
                        >
                          🦴 Kloubní
                        </button>
                        <button
                          type="button"
                          onClick={() => setPainType('tendon')}
                          className={cn(
                            "py-3 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                            painType === 'tendon'
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:border-muted-foreground"
                          )}
                        >
                          🦵 Šlachová
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {painType === 'muscle' 
                          ? 'Normální reakce na trénink, obvykle přejde do 24-48 hodin.'
                          : painType === 'joint'
                          ? 'Kloubní bolest může vyžadovat pozornost – trenér upraví trénink.'
                          : painType === 'tendon'
                          ? 'Šlachová bolest může signalizovat přetížení – důležité sledovat.'
                          : 'Pomůže nám rozlišit běžnou únavu od možného problému.'}
                      </p>
                    </div>

                    <BodyPainSelector
                      selectedAreas={painSelections}
                      onChange={handlePainSelectionsChange}
                      language="cs"
                      gender={formData?.clientGender}
                    />
                    
                    {/* Other pain area text input */}
                    {painSelections.some(s => s.area === 'other') && (
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
        </div>

        {/* OPTIONAL Questions - Collapsible section */}
        {optionalQuestions.length > 0 && (
          <Collapsible open={showOptional} onOpenChange={setShowOptional} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between h-12 glass-subtle border border-border/50"
              >
                <span className="flex items-center gap-2">
                  💡 Chceš doplnit více detailů?
                  <span className="text-xs text-muted-foreground">(volitelné)</span>
                </span>
                <ChevronDown className={cn(
                  "w-5 h-5 transition-transform",
                  showOptional && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {optionalQuestions.map((question) => renderSlider(question))}
              
              {/* Sleep Hours Slider - moved to optional */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-medium">
                        🕐 Kolik hodin jsi spal/a?
                      </Label>
                      <span className="text-2xl font-bold text-primary">{sleepHours}h</span>
                    </div>
                    <Slider
                      value={[sleepHours]}
                      onValueChange={([v]) => setSleepHours(v)}
                      min={4}
                      max={12}
                      step={0.5}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>4h</span>
                      <span>12h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sleep After Training Question - moved to optional */}
              <Card>
                <CardContent className="pt-6">
                  <Label className="mb-3 block text-base font-medium">
                    😴 Jak ses vyspal/a po tréninku?
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSleepAfter('poor')}
                      className={cn(
                        "py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                        sleepAfter === 'poor'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:border-muted-foreground"
                      )}
                    >
                      😫 Špatně
                    </button>
                    <button
                      type="button"
                      onClick={() => setSleepAfter('average')}
                      className={cn(
                        "py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                        sleepAfter === 'average'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:border-muted-foreground"
                      )}
                    >
                      😐 Průměrně
                    </button>
                    <button
                      type="button"
                      onClick={() => setSleepAfter('good')}
                      className={cn(
                        "py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                        sleepAfter === 'good'
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:border-muted-foreground"
                      )}
                    >
                      😊 Dobře
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Optional note */}
              {questionsConfig.noteEnabled && (
                <Card>
                  <CardContent className="pt-6">
                    <Label className="mb-3 block text-base font-medium">
                      📝 Poznámka (volitelné)
                    </Label>
                    <Textarea
                      placeholder="Např.: dnes těžké nohy, tah v koleni při dřepech, jinak ok."
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
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Submit Button */}
        <Button
          className="w-full mt-6 h-14 text-lg font-semibold"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Odesílám...
            </>
          ) : (
            'Odeslat zpětnou vazbu'
          )}
        </Button>

        {/* Footer with reject option */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Vaše odpovědi jsou důvěrné a pomohou zlepšit váš trénink.
          </p>
          <button
            type="button"
            onClick={() => setShowRejectConfirm(true)}
            className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Tohle nejsem já / špatný příjemce
          </button>
        </div>
      </div>
    </div>
  );
}
