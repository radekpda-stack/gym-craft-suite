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
import { ChevronLeft, ChevronRight, Loader2, Save, Send, User, Activity, Heart, Moon, Target, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
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

const STEPS = [
  { id: 'identity', title: 'Základní údaje', icon: User },
  { id: 'context', title: 'Kontext', icon: Activity },
  { id: 'movement', title: 'Pohyb', icon: Activity },
  { id: 'pain', title: 'Bolesti', icon: Heart },
  { id: 'health', title: 'Zdraví', icon: Heart },
  { id: 'sleep', title: 'Spánek', icon: Moon },
  { id: 'goals', title: 'Cíle', icon: Target },
  { id: 'open', title: 'Doplnění', icon: MessageSquare },
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

const PRIORITIES = [
  'síla', 'vytrvalost', 'pohyblivost', 'stabilita', 'regenerace', 'hubnutí'
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
  const [currentStep, setCurrentStep] = useState(0);
  
  // Skip identity step for existing clients
  const visibleSteps = isNewClient ? STEPS : STEPS.filter(s => s.id !== 'identity');
  const totalSteps = visibleSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Autosave on data change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      onAutosave(formData);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, onAutosave]);

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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+420 777 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label>Pohlaví</Label>
              <RadioGroup
                value={formData.gender || ''}
                onValueChange={(v) => updateField('gender', v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Muž</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Žena</Label>
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
              />
            </div>
          </div>
        );

      case 'context':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="age">Věk</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => updateField('age', parseInt(e.target.value) || undefined)}
                placeholder="35"
              />
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
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Typ pracovního dne</Label>
              <RadioGroup
                value={formData.daily_activity_type || ''}
                onValueChange={(v) => updateField('daily_activity_type', v)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                  <RadioGroupItem value="sedentary" id="sedentary" />
                  <Label htmlFor="sedentary" className="flex-1 cursor-pointer">
                    <span className="font-medium">Sedavý</span>
                    <p className="text-sm text-muted-foreground">Většinu dne sedím u počítače</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                  <RadioGroupItem value="combined" id="combined" />
                  <Label htmlFor="combined" className="flex-1 cursor-pointer">
                    <span className="font-medium">Kombinovaný</span>
                    <p className="text-sm text-muted-foreground">Střídám sezení a pohyb</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                  <RadioGroupItem value="physical" id="physical" />
                  <Label htmlFor="physical" className="flex-1 cursor-pointer">
                    <span className="font-medium">Fyzicky aktivní</span>
                    <p className="text-sm text-muted-foreground">Většinu dne jsem na nohou</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 'movement':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zkušenost s cvičením</Label>
              <RadioGroup
                value={formData.movement_experience || ''}
                onValueChange={(v) => updateField('movement_experience', v)}
                className="space-y-2"
              >
                {['začátečník', 'mírně pokročilý', 'pokročilý', 'zkušený'].map((level) => (
                  <div key={level} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                    <RadioGroupItem value={level} id={level} />
                    <Label htmlFor={level} className="cursor-pointer capitalize">{level}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Aktuální pohybové aktivity</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENT_ACTIVITIES.map((activity) => (
                  <Badge
                    key={activity}
                    variant={(formData.current_activities || []).includes(activity) ? 'default' : 'outline'}
                    className="cursor-pointer"
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
                className="mt-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Jak často se hýbu?</Label>
              <RadioGroup
                value={formData.movement_frequency || ''}
                onValueChange={(v) => updateField('movement_frequency', v)}
                className="space-y-2"
              >
                {['méně než 1× týdně', '1-2× týdně', '3-4× týdně', '5× a více týdně'].map((freq) => (
                  <div key={freq} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                    <RadioGroupItem value={freq} id={freq} />
                    <Label htmlFor={freq} className="cursor-pointer">{freq}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 'pain':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Máte aktuálně nějaké bolesti?</Label>
              <RadioGroup
                value={formData.has_pain !== undefined ? (formData.has_pain ? 'yes' : 'no') : ''}
                onValueChange={(v) => updateField('has_pain', v === 'yes')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="pain-yes" />
                  <Label htmlFor="pain-yes">Ano</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="pain-no" />
                  <Label htmlFor="pain-no">Ne</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.has_pain && (
              <>
                <div className="space-y-2">
                  <Label>Kde vás bolí?</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAIN_AREAS.map((area) => (
                      <Badge
                        key={area}
                        variant={(formData.pain_areas || []).includes(area) ? 'destructive' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayField('pain_areas', area)}
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Typ bolesti</Label>
                  <RadioGroup
                    value={formData.pain_type || ''}
                    onValueChange={(v) => updateField('pain_type', v)}
                    className="space-y-2"
                  >
                    {['tupá', 'ostrá', 'pálení', 'brnění'].map((type) => (
                      <div key={type} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                        <RadioGroupItem value={type} id={`pain-type-${type}`} />
                        <Label htmlFor={`pain-type-${type}`} className="cursor-pointer capitalize">{type}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Jak moc vás bolest omezuje?</Label>
                  <RadioGroup
                    value={formData.pain_limitation || ''}
                    onValueChange={(v) => updateField('pain_limitation', v)}
                    className="space-y-2"
                  >
                    {['vůbec', 'mírně', 'výrazně', 'velmi výrazně'].map((level) => (
                      <div key={level} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                        <RadioGroupItem value={level} id={`pain-lim-${level}`} />
                        <Label htmlFor={`pain-lim-${level}`} className="cursor-pointer capitalize">{level}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </>
            )}
          </div>
        );

      case 'health':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has_injury">Měl/a jste nějaký úraz?</Label>
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
                />
              )}
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has_surgery">Prodělal/a jste operaci?</Label>
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
                />
              )}
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="takes_medication">Berete pravidelně léky?</Label>
                <Checkbox
                  id="takes_medication"
                  checked={formData.takes_medication || false}
                  onCheckedChange={(v) => updateField('takes_medication', v)}
                />
              </div>
              {formData.takes_medication && (
                <Input
                  placeholder="Jaké léky?"
                  value={formData.medication_details || ''}
                  onChange={(e) => updateField('medication_details', e.target.value)}
                />
              )}
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has_movement_concerns">Máte obavy z pohybu?</Label>
                <Checkbox
                  id="has_movement_concerns"
                  checked={formData.has_movement_concerns || false}
                  onCheckedChange={(v) => updateField('has_movement_concerns', v)}
                />
              </div>
              {formData.has_movement_concerns && (
                <Input
                  placeholder="Jaké obavy?"
                  value={formData.movement_concerns || ''}
                  onChange={(e) => updateField('movement_concerns', e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_notes">Další zdravotní poznámky</Label>
              <Textarea
                id="health_notes"
                value={formData.health_notes || ''}
                onChange={(e) => updateField('health_notes', e.target.value)}
                placeholder="Cokoliv dalšího, co bych měl vědět..."
              />
            </div>
          </div>
        );

      case 'sleep':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kolik hodin spíte průměrně?</Label>
              <RadioGroup
                value={formData.sleep_hours_avg || ''}
                onValueChange={(v) => updateField('sleep_hours_avg', v)}
                className="space-y-2"
              >
                {['méně než 5 hodin', '5-6 hodin', '6-7 hodin', '7-8 hodin', 'více než 8 hodin'].map((hours) => (
                  <div key={hours} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                    <RadioGroupItem value={hours} id={hours} />
                    <Label htmlFor={hours} className="cursor-pointer">{hours}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Jak se cítíte po probuzení?</Label>
              <RadioGroup
                value={formData.sleep_quality || ''}
                onValueChange={(v) => updateField('sleep_quality', v)}
                className="space-y-2"
              >
                {['odpočatý/á', 'trochu unavený/á', 'unavený/á', 'vyčerpaný/á'].map((quality) => (
                  <div key={quality} className="flex items-center space-x-2 p-3 rounded-lg bg-secondary/50">
                    <RadioGroupItem value={quality} id={quality} />
                    <Label htmlFor={quality} className="cursor-pointer">{quality}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hlavní cíl</Label>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((goal) => (
                  <Badge
                    key={goal}
                    variant={formData.main_goal === goal ? 'default' : 'outline'}
                    className="cursor-pointer"
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
                className="mt-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority (max. 2)</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((priority) => {
                  const selected = (formData.priorities || []).includes(priority);
                  const disabled = !selected && (formData.priorities || []).length >= 2;
                  return (
                    <Badge
                      key={priority}
                      variant={selected ? 'default' : 'outline'}
                      className={cn('cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}
                      onClick={() => !disabled && toggleArrayField('priorities', priority)}
                    >
                      {priority}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_preferences">Jaký trénink preferujete?</Label>
              <Textarea
                id="training_preferences"
                value={formData.training_preferences || ''}
                onChange={(e) => updateField('training_preferences', e.target.value)}
                placeholder="Co vás baví, co vám vyhovuje..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_dislikes">Co nechcete?</Label>
              <Textarea
                id="training_dislikes"
                value={formData.training_dislikes || ''}
                onChange={(e) => updateField('training_dislikes', e.target.value)}
                placeholder="Co vám nevyhovuje, čemu se chcete vyhnout..."
              />
            </div>
          </div>
        );

      case 'open':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="open_question">
                Je něco, co bych měl vědět před prvním setkáním?
              </Label>
              <Textarea
                id="open_question"
                value={formData.open_question || ''}
                onChange={(e) => updateField('open_question', e.target.value)}
                placeholder="Cokoliv dalšího, co vás napadá..."
                className="min-h-[150px]"
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold">Pre-diagnostický formulář</h1>
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
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Krok {currentStep + 1} z {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Card className="glass border-0 mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <StepIcon className="w-5 h-5 text-primary" />
              {currentStepData.title}
            </CardTitle>
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
                  Odeslat formulář
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
