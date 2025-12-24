import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, Send, Save, User, Briefcase, Activity, AlertTriangle, Moon, Target, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PreDiagnosticWelcome } from './PreDiagnosticWelcome';
import type { PreDiagnosticFormData } from '@/pages/PreDiagnosticFormPage';

interface Props {
  formData: PreDiagnosticFormData;
  setFormData: React.Dispatch<React.SetStateAction<PreDiagnosticFormData>>;
  onAutosave: (data: PreDiagnosticFormData) => void;
  onSubmit: (data: PreDiagnosticFormData) => void;
  isSubmitting: boolean;
  lastSaved: Date | null;
  isNewClient: boolean;
  clientName?: string;
}

// Simplified steps for the questionnaire
const STEPS = [
  { id: 'identity', title: 'Základní údaje', icon: User, description: 'Řekni nám o sobě' },
  { id: 'lifestyle', title: 'Denní režim', icon: Briefcase, description: 'Tvůj typický den' },
  { id: 'movement', title: 'Pohyb', icon: Activity, description: 'Tvé pohybové aktivity' },
  { id: 'sleep', title: 'Spánek', icon: Moon, description: 'Regenerace a odpočinek' },
  { id: 'pain', title: 'Bolest nebo omezení', icon: AlertTriangle, description: 'Aktuální stav' },
  { id: 'goals', title: 'Cíle', icon: Target, description: 'Co chceš dosáhnout' },
  { id: 'final', title: 'Doplnění', icon: MessageSquare, description: 'Poslední poznámky' },
];

const PAIN_AREAS = [
  'krk', 'ramena', 'horní záda', 'bederní páteř', 
  'kyčle', 'kolena', 'kotníky', 'zápěstí', 'lokty'
];

const CURRENT_ACTIVITIES = [
  'běh', 'posilovna', 'jóga', 'plavání', 'cyklistika', 
  'chůze', 'skupinové lekce', 'bojové sporty', 'tenis', 'golf'
];

const GOALS = [
  'zhubnout', 'nabrat svaly', 'zlepšit kondici', 'zbavit se bolesti',
  'lepší pohyblivost', 'prevence zranění', 'sportovní výkon', 'celkové zdraví'
];

export function PreDiagnosticFormContent({
  formData,
  setFormData,
  onAutosave,
  onSubmit,
  isSubmitting,
  lastSaved,
  isNewClient,
  clientName,
}: Props) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Skip identity step for existing clients
  const visibleSteps = isNewClient ? STEPS : STEPS.filter(s => s.id !== 'identity');
  const totalSteps = visibleSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Autosave on data change (debounced)
  useEffect(() => {
    if (showWelcome) return;
    const timer = setTimeout(() => {
      onAutosave(formData);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, onAutosave, showWelcome]);

  const updateField = useCallback((field: keyof PreDiagnosticFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const toggleArrayField = useCallback((field: keyof PreDiagnosticFormData, value: string) => {
    setFormData(prev => {
      const arr = (prev[field] as string[]) || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  }, [setFormData]);

  const canGoNext = () => {
    const step = visibleSteps[currentStep];
    switch (step.id) {
      case 'identity':
        return !!(formData.name && formData.email);
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  // Show welcome screen first
  if (showWelcome) {
    return (
      <PreDiagnosticWelcome 
        onStart={() => setShowWelcome(false)} 
        clientName={clientName}
      />
    );
  }

  const renderStep = () => {
    const step = visibleSteps[currentStep];

    switch (step.id) {
      case 'identity':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Jméno a příjmení *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Jan Novák"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="jan@email.cz"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+420 777 123 456"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Pohlaví</Label>
              <RadioGroup
                value={formData.gender || ''}
                onValueChange={(v) => updateField('gender', v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50 flex-1">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">Muž</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50 flex-1">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">Žena</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Datum narození</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date || ''}
                onChange={(e) => updateField('birth_date', e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          </div>
        );

      case 'lifestyle':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Jaký typ povolání vykonáváš?</Label>
              <RadioGroup
                value={formData.daily_activity_type || ''}
                onValueChange={(v) => updateField('daily_activity_type', v)}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                  <RadioGroupItem value="sedentary" id="sedentary" className="mt-0.5" />
                  <Label htmlFor="sedentary" className="flex-1 cursor-pointer">
                    <span className="font-medium">Převážně sedavé</span>
                    <p className="text-sm text-muted-foreground mt-0.5">Většinu dne sedím u počítače</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                  <RadioGroupItem value="combined" id="combined" className="mt-0.5" />
                  <Label htmlFor="combined" className="flex-1 cursor-pointer">
                    <span className="font-medium">Kombinace sezení a pohybu</span>
                    <p className="text-sm text-muted-foreground mt-0.5">Střídám práci u stolu s pohybem</p>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
                  <RadioGroupItem value="physical" id="physical" className="mt-0.5" />
                  <Label htmlFor="physical" className="flex-1 cursor-pointer">
                    <span className="font-medium">Převážně fyzicky aktivní</span>
                    <p className="text-sm text-muted-foreground mt-0.5">Většinu dne jsem na nohou nebo v pohybu</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Výška (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ''}
                  onChange={(e) => updateField('height', parseInt(e.target.value) || undefined)}
                  placeholder="175"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Váha (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => updateField('weight', parseInt(e.target.value) || undefined)}
                  placeholder="80"
                  className="bg-secondary/50"
                />
              </div>
            </div>
          </div>
        );

      case 'movement':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Kolik pohybu máš běžně za týden?</Label>
              <RadioGroup
                value={formData.movement_frequency || ''}
                onValueChange={(v) => updateField('movement_frequency', v)}
                className="space-y-2"
              >
                {[
                  { value: 'very_little', label: 'Velmi málo', desc: 'Téměř žádný cílený pohyb' },
                  { value: 'little', label: 'Spíše málo', desc: '1-2× týdně' },
                  { value: 'moderate', label: 'Přiměřeně', desc: '3-4× týdně' },
                  { value: 'lot', label: 'Hodně', desc: '5× a více týdně' },
                ].map((option) => (
                  <div 
                    key={option.value} 
                    className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                    <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{option.desc}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Aktuální pohybové aktivity</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENT_ACTIVITIES.map((activity) => (
                  <Badge
                    key={activity}
                    variant={(formData.current_activities || []).includes(activity) ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/90"
                    onClick={() => toggleArrayField('current_activities', activity)}
                  >
                    {activity}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Jiné aktivity..."
                value={formData.current_activities_other || ''}
                onChange={(e) => updateField('current_activities_other', e.target.value)}
                className="bg-secondary/50 mt-2"
              />
            </div>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Jak hodnotíš svůj spánek?</Label>
              <RadioGroup
                value={formData.sleep_quality || ''}
                onValueChange={(v) => updateField('sleep_quality', v)}
                className="space-y-2"
              >
                {[
                  { value: 'very_good', label: 'Velmi dobrý', desc: 'Vstávám odpočatý/á' },
                  { value: 'good', label: 'Spíše dobrý', desc: 'Občas se necítím úplně fit' },
                  { value: 'bad', label: 'Spíše špatný', desc: 'Často jsem unavený/á' },
                  { value: 'very_bad', label: 'Velmi špatný', desc: 'Trpím chronickou únavou' },
                ].map((option) => (
                  <div 
                    key={option.value} 
                    className="flex items-start space-x-3 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                  >
                    <RadioGroupItem value={option.value} id={`sleep-${option.value}`} className="mt-0.5" />
                    <Label htmlFor={`sleep-${option.value}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-muted-foreground mt-0.5">{option.desc}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Průměrná délka spánku</Label>
              <RadioGroup
                value={formData.sleep_hours_avg || ''}
                onValueChange={(v) => updateField('sleep_hours_avg', v)}
                className="grid grid-cols-2 gap-2"
              >
                {['méně než 5 h', '5-6 h', '6-7 h', '7-8 h', 'více než 8 h'].map((hours) => (
                  <div 
                    key={hours} 
                    className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                  >
                    <RadioGroupItem value={hours} id={`hours-${hours}`} />
                    <Label htmlFor={`hours-${hours}`} className="cursor-pointer">{hours}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 'pain':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Máš aktuálně bolest nebo omezení pohybu?</Label>
              <RadioGroup
                value={formData.has_pain !== undefined ? (formData.has_pain ? 'yes' : 'no') : ''}
                onValueChange={(v) => updateField('has_pain', v === 'yes')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors flex-1">
                  <RadioGroupItem value="no" id="pain-no" />
                  <Label htmlFor="pain-no" className="cursor-pointer font-medium">Ne</Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors flex-1">
                  <RadioGroupItem value="yes" id="pain-yes" />
                  <Label htmlFor="pain-yes" className="cursor-pointer font-medium">Ano</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.has_pain && (
              <>
                <div className="space-y-3">
                  <Label className="text-base">Kde tě bolí?</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAIN_AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={(formData.pain_areas || []).includes(area) ? 'destructive' : 'outline'}
                        className="cursor-pointer px-3 py-1.5 text-sm"
                        onClick={() => toggleArrayField('pain_areas', area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pain_details">Popis bolesti (volitelné)</Label>
                  <Textarea
                    id="pain_details"
                    value={formData.pain_type || ''}
                    onChange={(e) => updateField('pain_type', e.target.value)}
                    placeholder="Popiš bolest, kdy se objevuje, jak dlouho trvá..."
                    className="bg-secondary/50 min-h-[80px]"
                  />
                </div>
              </>
            )}

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_injury" className="cursor-pointer">Měl/a jsi nějaký úraz?</Label>
                  <Checkbox
                    id="has_injury"
                    checked={formData.has_injury || false}
                    onCheckedChange={(v) => updateField('has_injury', v)}
                  />
                </div>
                {formData.has_injury && (
                  <Input
                    placeholder="Jaký úraz?"
                    value={formData.injury_details || ''}
                    onChange={(e) => updateField('injury_details', e.target.value)}
                    className="bg-background/50"
                  />
                )}
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="has_surgery" className="cursor-pointer">Prodělal/a jsi operaci?</Label>
                  <Checkbox
                    id="has_surgery"
                    checked={formData.has_surgery || false}
                    onCheckedChange={(v) => updateField('has_surgery', v)}
                  />
                </div>
                {formData.has_surgery && (
                  <Input
                    placeholder="Jakou operaci?"
                    value={formData.surgery_details || ''}
                    onChange={(e) => updateField('surgery_details', e.target.value)}
                    className="bg-background/50"
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">Co je tvůj hlavní cíl?</Label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => (
                  <Badge
                    key={goal}
                    variant={formData.main_goal === goal ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/90"
                    onClick={() => updateField('main_goal', goal)}
                  >
                    {goal}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Jiný cíl..."
                value={formData.main_goal_other || ''}
                onChange={(e) => updateField('main_goal_other', e.target.value)}
                className="bg-secondary/50 mt-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_preferences">Jaký trénink preferuješ? (volitelné)</Label>
              <Textarea
                id="training_preferences"
                value={formData.training_preferences || ''}
                onChange={(e) => updateField('training_preferences', e.target.value)}
                placeholder="Co tě baví, co ti vyhovuje..."
                className="bg-secondary/50 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_dislikes">Čemu se chceš vyhnout? (volitelné)</Label>
              <Textarea
                id="training_dislikes"
                value={formData.training_dislikes || ''}
                onChange={(e) => updateField('training_dislikes', e.target.value)}
                placeholder="Co ti nevyhovuje, čeho se bojíš..."
                className="bg-secondary/50 min-h-[80px]"
              />
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="open_question" className="text-base">
                Je něco, co bych měl vědět před prvním setkáním?
              </Label>
              <p className="text-sm text-muted-foreground">
                Cokoliv dalšího, co tě napadá – zdravotní omezení, obavy, očekávání...
              </p>
              <Textarea
                id="open_question"
                value={formData.open_question || ''}
                onChange={(e) => updateField('open_question', e.target.value)}
                placeholder="Napiš sem cokoliv důležitého..."
                className="bg-secondary/50 min-h-[150px]"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = visibleSteps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="public-page pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold">Diagnostika pohybu</h1>
              {clientName && (
                <p className="text-sm text-muted-foreground">{clientName}</p>
              )}
            </div>
            {lastSaved && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save className="w-3 h-3" />
                {format(lastSaved, 'HH:mm', { locale: cs })}
              </div>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            Krok {currentStep + 1} z {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Card className="public-card mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 safe-area-bottom">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Zpět
          </Button>

          {currentStep === totalSteps - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 flex-1 max-w-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Odesílám...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Odeslat
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="gap-2 flex-1 max-w-xs"
            >
              Pokračovat
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
