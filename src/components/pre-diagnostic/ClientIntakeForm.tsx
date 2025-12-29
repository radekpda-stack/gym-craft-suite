import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Loader2, Send, Save, User, Briefcase, Activity, Heart, Target, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export interface ClientIntakeData {
  // Identifikace (pouze pro nové klienty)
  name?: string;
  email?: string;
  phone?: string;
  
  // Základní údaje
  birth_year?: number;
  gender?: 'male' | 'female';
  
  // Práce a životní styl
  work_type?: 'sedentary' | 'combined' | 'active' | 'physical';
  sitting_hours?: number;
  
  // Pohyb
  movement_frequency?: 'none' | '1-2' | '3-4' | '5+';
  
  // Spánek
  sleep_hours?: number;
  sleep_quality?: 1 | 2 | 3 | 4 | 5;
  
  // Strava
  diet_quality?: 'good' | 'average' | 'chaotic';
  diet_note?: string;
  
  // Bolest / omezení
  has_pain?: boolean;
  pain_areas?: string[];
  pain_note?: string;
  
  // Zdraví
  health_notes?: string;
  
  // Cíl
  main_goal?: string;
}

interface Props {
  formData: ClientIntakeData;
  setFormData: React.Dispatch<React.SetStateAction<ClientIntakeData>>;
  onAutosave: (data: ClientIntakeData) => void;
  onSubmit: (data: ClientIntakeData) => void;
  isSubmitting: boolean;
  lastSaved: Date | null;
  isNewClient: boolean;
  clientName?: string;
}

const PAIN_AREAS = [
  'krk', 'ramena', 'horní záda', 'bederní páteř', 
  'kyčle', 'kolena', 'kotníky', 'zápěstí'
];

export function ClientIntakeForm({
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
  
  // 2 steps for max simplicity
  const STEPS = isNewClient 
    ? [
        { id: 'about', title: 'O tobě', icon: User },
        { id: 'lifestyle', title: 'Životní styl & cíl', icon: Target },
      ]
    : [
        { id: 'lifestyle', title: 'Životní styl & cíl', icon: Target },
      ];
  
  const totalSteps = STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Autosave on data change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      onAutosave(formData);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, onAutosave]);

  const updateField = useCallback(<K extends keyof ClientIntakeData>(field: K, value: ClientIntakeData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const togglePainArea = useCallback((area: string) => {
    setFormData(prev => {
      const arr = prev.pain_areas || [];
      if (arr.includes(area)) {
        return { ...prev, pain_areas: arr.filter(a => a !== area) };
      }
      return { ...prev, pain_areas: [...arr, area] };
    });
  }, [setFormData]);

  const canGoNext = () => {
    const step = STEPS[currentStep];
    if (step.id === 'about' && isNewClient) {
      return !!(formData.name && formData.email && formData.birth_year);
    }
    if (step.id === 'lifestyle') {
      return !!(formData.work_type && formData.movement_frequency && formData.sleep_hours);
    }
    return true;
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

  const renderAboutStep = () => (
    <div className="space-y-5">
      {/* Identifikace */}
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
      </div>

      {/* Rok narození */}
      <div className="space-y-2">
        <Label htmlFor="birth_year">Rok narození *</Label>
        <Input
          id="birth_year"
          type="number"
          value={formData.birth_year || ''}
          onChange={(e) => updateField('birth_year', parseInt(e.target.value) || undefined)}
          placeholder="1990"
          className="bg-secondary/50"
          min={1920}
          max={new Date().getFullYear()}
        />
      </div>

      {/* Pohlaví */}
      <div className="space-y-2">
        <Label>Pohlaví</Label>
        <RadioGroup
          value={formData.gender || ''}
          onValueChange={(v) => updateField('gender', v as 'male' | 'female')}
          className="flex gap-3"
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
    </div>
  );

  const renderLifestyleStep = () => (
    <div className="space-y-6">
      {/* Typ práce */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Jaká je tvoje práce? *
        </Label>
        <RadioGroup
          value={formData.work_type || ''}
          onValueChange={(v) => updateField('work_type', v as ClientIntakeData['work_type'])}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { value: 'sedentary', label: 'Sedavá' },
            { value: 'combined', label: 'Kombinovaná' },
            { value: 'active', label: 'Aktivní' },
            { value: 'physical', label: 'Fyzicky náročná' },
          ].map((opt) => (
            <div 
              key={opt.value}
              className={cn(
                "flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-colors",
                formData.work_type === opt.value 
                  ? "bg-primary/20 border border-primary" 
                  : "bg-secondary/50 hover:bg-secondary/70"
              )}
              onClick={() => updateField('work_type', opt.value as ClientIntakeData['work_type'])}
            >
              <RadioGroupItem value={opt.value} id={opt.value} />
              <Label htmlFor={opt.value} className="cursor-pointer text-sm">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Sezení denně */}
      <div className="space-y-3">
        <Label className="text-base">Kolik hodin denně sedíš?</Label>
        <div className="px-2">
          <Slider
            value={[formData.sitting_hours ?? 6]}
            onValueChange={([v]) => updateField('sitting_hours', v)}
            max={12}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0h</span>
            <span className="font-medium text-foreground">{formData.sitting_hours ?? 6}h</span>
            <span>12h</span>
          </div>
        </div>
      </div>

      {/* Pohyb týdně */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Kolikrát týdně cvičíš? *
        </Label>
        <RadioGroup
          value={formData.movement_frequency || ''}
          onValueChange={(v) => updateField('movement_frequency', v as ClientIntakeData['movement_frequency'])}
          className="grid grid-cols-4 gap-2"
        >
          {[
            { value: 'none', label: '0×' },
            { value: '1-2', label: '1-2×' },
            { value: '3-4', label: '3-4×' },
            { value: '5+', label: '5+' },
          ].map((opt) => (
            <div 
              key={opt.value}
              className={cn(
                "flex items-center justify-center p-3 rounded-lg cursor-pointer transition-colors text-center",
                formData.movement_frequency === opt.value 
                  ? "bg-primary/20 border border-primary" 
                  : "bg-secondary/50 hover:bg-secondary/70"
              )}
              onClick={() => updateField('movement_frequency', opt.value as ClientIntakeData['movement_frequency'])}
            >
              <span className="font-medium">{opt.label}</span>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Spánek */}
      <div className="space-y-3">
        <Label className="text-base">Spánek *</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Průměr hodin</Label>
            <Input
              type="number"
              value={formData.sleep_hours || ''}
              onChange={(e) => updateField('sleep_hours', parseFloat(e.target.value) || undefined)}
              placeholder="7"
              className="bg-secondary/50"
              min={3}
              max={12}
              step={0.5}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Kvalita (1-5)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateField('sleep_quality', n as 1 | 2 | 3 | 4 | 5)}
                  className={cn(
                    "flex-1 py-2 rounded-lg transition-colors text-sm font-medium",
                    formData.sleep_quality === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary/70"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strava */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          Jak bys zhodnotil/a svoji stravu?
        </Label>
        <RadioGroup
          value={formData.diet_quality || ''}
          onValueChange={(v) => updateField('diet_quality', v as ClientIntakeData['diet_quality'])}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { value: 'good', label: 'Spíš dobrá' },
            { value: 'average', label: 'Průměr' },
            { value: 'chaotic', label: 'Chaotická' },
          ].map((opt) => (
            <div 
              key={opt.value}
              className={cn(
                "flex items-center justify-center p-3 rounded-lg cursor-pointer transition-colors text-center",
                formData.diet_quality === opt.value 
                  ? "bg-primary/20 border border-primary" 
                  : "bg-secondary/50 hover:bg-secondary/70"
              )}
              onClick={() => updateField('diet_quality', opt.value as ClientIntakeData['diet_quality'])}
            >
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Bolest */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Máš aktuálně bolest nebo omezení?
        </Label>
        <RadioGroup
          value={formData.has_pain !== undefined ? (formData.has_pain ? 'yes' : 'no') : ''}
          onValueChange={(v) => updateField('has_pain', v === 'yes')}
          className="flex gap-3"
        >
          <div className={cn(
            "flex items-center space-x-2 p-3 rounded-lg flex-1 cursor-pointer transition-colors",
            formData.has_pain === false ? "bg-primary/20 border border-primary" : "bg-secondary/50"
          )}>
            <RadioGroupItem value="no" id="pain-no" />
            <Label htmlFor="pain-no" className="cursor-pointer">Ne</Label>
          </div>
          <div className={cn(
            "flex items-center space-x-2 p-3 rounded-lg flex-1 cursor-pointer transition-colors",
            formData.has_pain === true ? "bg-destructive/20 border border-destructive" : "bg-secondary/50"
          )}>
            <RadioGroupItem value="yes" id="pain-yes" />
            <Label htmlFor="pain-yes" className="cursor-pointer">Ano</Label>
          </div>
        </RadioGroup>

        {formData.has_pain && (
          <div className="space-y-3 pl-2 border-l-2 border-destructive/30">
            <Label className="text-sm">Kde?</Label>
            <div className="flex flex-wrap gap-2">
              {PAIN_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={(formData.pain_areas || []).includes(area) ? 'destructive' : 'outline'}
                  className="cursor-pointer px-3 py-1"
                  onClick={() => togglePainArea(area)}
                >
                  {area}
                </Badge>
              ))}
            </div>
            <Textarea
              value={formData.pain_note || ''}
              onChange={(e) => updateField('pain_note', e.target.value)}
              placeholder="Krátká poznámka k bolesti..."
              className="bg-secondary/50 min-h-[60px]"
            />
          </div>
        )}
      </div>

      {/* Zdravotní omezení */}
      <div className="space-y-2">
        <Label htmlFor="health_notes">Zdravotní omezení, operace, úrazy</Label>
        <Textarea
          id="health_notes"
          value={formData.health_notes || ''}
          onChange={(e) => updateField('health_notes', e.target.value)}
          placeholder="Volitelné - cokoliv důležitého pro trenéra..."
          className="bg-secondary/50 min-h-[60px]"
        />
      </div>

      {/* Cíl */}
      <div className="space-y-2">
        <Label htmlFor="main_goal" className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Co chceš zlepšit? (jedna věta)
        </Label>
        <Input
          id="main_goal"
          value={formData.main_goal || ''}
          onChange={(e) => updateField('main_goal', e.target.value)}
          placeholder="Např. zbavit se bolesti zad, zhubnout, nabrat svaly..."
          className="bg-secondary/50"
        />
      </div>
    </div>
  );

  const renderStep = () => {
    const step = STEPS[currentStep];
    switch (step.id) {
      case 'about':
        return renderAboutStep();
      case 'lifestyle':
        return renderLifestyleStep();
      default:
        return null;
    }
  };

  const currentStepData = STEPS[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="public-page pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold">Vstupní dotazník</h1>
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
              disabled={isSubmitting || !canGoNext()}
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
