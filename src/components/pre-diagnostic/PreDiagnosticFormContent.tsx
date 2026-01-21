import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, Send, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
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

// Simplified steps - consolidated from 7 to 5
const STEPS = [
  { 
    id: 'about', 
    title: 'O tobě', 
    emoji: '👤',
    description: 'Základní info a tvůj typický den'
  },
  { 
    id: 'movement', 
    title: 'Pohyb a spánek', 
    emoji: '🏃',
    description: 'Jak se hýbeš a jak odpočíváš'
  },
  { 
    id: 'health', 
    title: 'Zdraví', 
    emoji: '🩺',
    description: 'Bolesti, úrazy nebo omezení'
  },
  { 
    id: 'goals', 
    title: 'Tvé cíle', 
    emoji: '🎯',
    description: 'Co chceš dosáhnout'
  },
  { 
    id: 'final', 
    title: 'Na závěr', 
    emoji: '💬',
    description: 'Ještě něco důležitého?'
  },
];

// Identity step for new clients
const IDENTITY_STEP = { 
  id: 'identity', 
  title: 'Kdo jsi?', 
  emoji: '📝',
  description: 'Abychom tě mohli identifikovat'
};

const PAIN_AREAS = [
  { value: 'krk', emoji: '🔵' },
  { value: 'ramena', emoji: '🔵' },
  { value: 'horní záda', emoji: '🔵' },
  { value: 'bederní páteř', emoji: '🔵' },
  { value: 'kyčle', emoji: '🔵' },
  { value: 'kolena', emoji: '🔵' },
  { value: 'kotníky', emoji: '🔵' },
  { value: 'zápěstí', emoji: '🔵' },
  { value: 'lokty', emoji: '🔵' },
];

const CURRENT_ACTIVITIES = [
  { value: 'běh', emoji: '🏃' },
  { value: 'posilovna', emoji: '🏋️' },
  { value: 'jóga', emoji: '🧘' },
  { value: 'plavání', emoji: '🏊' },
  { value: 'cyklistika', emoji: '🚴' },
  { value: 'chůze', emoji: '🚶' },
  { value: 'skupinové lekce', emoji: '👥' },
  { value: 'bojové sporty', emoji: '🥊' },
  { value: 'tenis', emoji: '🎾' },
  { value: 'golf', emoji: '⛳' },
];

const GOALS = [
  { value: 'zhubnout', emoji: '⚖️' },
  { value: 'nabrat svaly', emoji: '💪' },
  { value: 'zlepšit kondici', emoji: '❤️' },
  { value: 'zbavit se bolesti', emoji: '🩹' },
  { value: 'lepší pohyblivost', emoji: '🤸' },
  { value: 'prevence zranění', emoji: '🛡️' },
  { value: 'sportovní výkon', emoji: '🏆' },
  { value: 'celkové zdraví', emoji: '✨' },
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
  
  // Add identity step for new clients at the beginning
  const visibleSteps = isNewClient ? [IDENTITY_STEP, ...STEPS] : STEPS;
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
        // Require first name, last name, email, and gender for new clients
        return !!(formData.first_name && formData.last_name && formData.email && formData.gender);
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
          <div className="space-y-5">
            <p className="text-muted-foreground text-sm">
              Vyplň prosím základní údaje, abychom věděli, s kým máme tu čest. 😊
            </p>
            
            {/* First and last name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Křestní jméno *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ''}
                  onChange={(e) => {
                    updateField('first_name', e.target.value);
                    // Auto-update combined name
                    const fullName = `${e.target.value} ${formData.last_name || ''}`.trim();
                    updateField('name', fullName);
                  }}
                  placeholder="Jan"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Příjmení *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ''}
                  onChange={(e) => {
                    updateField('last_name', e.target.value);
                    // Auto-update combined name
                    const fullName = `${formData.first_name || ''} ${e.target.value}`.trim();
                    updateField('name', fullName);
                  }}
                  placeholder="Novák"
                  className="bg-secondary/50"
                />
              </div>
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
              <Label>Pohlaví *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('gender', 'male')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    formData.gender === 'male' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-1 block">👨</span>
                  <span className="text-sm font-medium">Muž</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('gender', 'female')}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    formData.gender === 'female' 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-1 block">👩</span>
                  <span className="text-sm font-medium">Žena</span>
                </button>
              </div>
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

      case 'about':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Řekni mi něco o sobě a o tom, jak vypadá tvůj běžný den. 📅
            </p>

            <div className="space-y-3">
              <Label className="text-base font-medium">Jak trávíš většinu pracovního dne?</Label>
              <div className="space-y-2">
                {[
                  { value: 'sedentary', emoji: '🪑', label: 'Většinou sedím', desc: 'Kancelář, práce u počítače' },
                  { value: 'combined', emoji: '🔄', label: 'Střídám sezení a pohyb', desc: 'Mix práce u stolu a na nohou' },
                  { value: 'physical', emoji: '🚶', label: 'Jsem hodně v pohybu', desc: 'Fyzická práce, neustále na nohou' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('daily_activity_type', option.value)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      formData.daily_activity_type === option.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.desc}</span>
                    </div>
                    {formData.daily_activity_type === option.value && (
                      <Check className="w-5 h-5 text-primary mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">📏 Výška (cm)</Label>
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
                <Label htmlFor="weight">⚖️ Váha (kg)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="age">🎂 Věk</Label>
              <Input
                id="age"
                type="number"
                value={formData.age || ''}
                onChange={(e) => updateField('age', parseInt(e.target.value) || undefined)}
                placeholder="35"
                className="bg-secondary/50"
              />
            </div>
          </div>
        );

      case 'movement':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Povídej, jak to máš s pohybem a odpočinkem. 💪
            </p>

            <div className="space-y-3">
              <Label className="text-base font-medium">Kolik pohybu máš běžně za týden?</Label>
              <div className="space-y-2">
                {[
                  { value: 'very_little', emoji: '😴', label: 'Téměř žádný', desc: 'Nemám čas nebo motivaci' },
                  { value: 'little', emoji: '🚶', label: '1–2× týdně', desc: 'Občas si zajdu zacvičit' },
                  { value: 'moderate', emoji: '🏃', label: '3–4× týdně', desc: 'Pravidelně sportuji' },
                  { value: 'lot', emoji: '💪', label: '5× a více', desc: 'Sport je můj životní styl' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('movement_frequency', option.value)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      formData.movement_frequency === option.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.desc}</span>
                    </div>
                    {formData.movement_frequency === option.value && (
                      <Check className="w-5 h-5 text-primary mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Co děláš za aktivity? (vyber všechny)</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENT_ACTIVITIES.map((activity) => (
                  <Badge
                    key={activity.value}
                    variant={(formData.current_activities || []).includes(activity.value) ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-primary/90 transition-all"
                    onClick={() => toggleArrayField('current_activities', activity.value)}
                  >
                    <span className="mr-1">{activity.emoji}</span>
                    {activity.value}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Něco jiného? Napiš..."
                value={formData.current_activities_other || ''}
                onChange={(e) => updateField('current_activities_other', e.target.value)}
                className="bg-secondary/50 mt-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-3">
                <Label className="text-base font-medium">😴 Jak spíš?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'very_good', emoji: '😊', label: 'Skvěle' },
                    { value: 'good', emoji: '🙂', label: 'Docela dobře' },
                    { value: 'bad', emoji: '😕', label: 'Spíš špatně' },
                    { value: 'very_bad', emoji: '😩', label: 'Velmi špatně' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('sleep_quality', option.value)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-center",
                        formData.sleep_quality === option.value 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl block mb-1">{option.emoji}</span>
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">⏰ Kolik hodin spíš v průměru?</Label>
              <div className="flex flex-wrap gap-2">
                {['méně než 5h', '5–6h', '6–7h', '7–8h', '8h+'].map((hours) => (
                  <Badge
                    key={hours}
                    variant={formData.sleep_hours_avg === hours ? 'default' : 'outline'}
                    className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-all"
                    onClick={() => updateField('sleep_hours_avg', hours)}
                  >
                    {hours}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Abych ti mohl připravit bezpečný trénink, potřebuji vědět o případných omezeních. 🏥
            </p>

            {/* Pain section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Bolí tě aktuálně něco?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('has_pain', false)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    formData.has_pain === false 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-1 block">😊</span>
                  <span className="text-sm font-medium">Ne, nic mě nebolí</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('has_pain', true)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    formData.has_pain === true 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl mb-1 block">🤕</span>
                  <span className="text-sm font-medium">Ano, něco mě bolí</span>
                </button>
              </div>

              <AnimatePresence>
                {formData.has_pain && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-3">
                      <Label>Kde tě to bolí? (vyber všechna místa)</Label>
                      <div className="flex flex-wrap gap-2">
                        {PAIN_AREAS.map((area) => (
                          <Badge
                            key={area.value}
                            variant={(formData.pain_areas || []).includes(area.value) ? 'destructive' : 'outline'}
                            className="cursor-pointer px-3 py-2 text-sm transition-all"
                            onClick={() => toggleArrayField('pain_areas', area.value)}
                          >
                            {area.value}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pain_details">Popiš tu bolest (volitelné)</Label>
                      <Textarea
                        id="pain_details"
                        value={formData.pain_type || ''}
                        onChange={(e) => updateField('pain_type', e.target.value)}
                        placeholder="Kdy se objevuje? Jak dlouho trvá? Co ji zhoršuje?"
                        className="bg-secondary/50 min-h-[80px]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Injury & Surgery section */}
            <div className="pt-4 border-t space-y-4">
              <Label className="text-base font-medium">Historie zdraví</Label>
              
              <div className="space-y-3">
                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  formData.has_injury ? "border-primary bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🩹</span>
                      <Label htmlFor="has_injury" className="cursor-pointer font-medium">
                        Měl/a jsi nějaký úraz?
                      </Label>
                    </div>
                    <Checkbox
                      id="has_injury"
                      checked={formData.has_injury || false}
                      onCheckedChange={(v) => updateField('has_injury', v)}
                    />
                  </div>
                  <AnimatePresence>
                    {formData.has_injury && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <Input
                          placeholder="Jaký úraz? Kdy to bylo?"
                          value={formData.injury_details || ''}
                          onChange={(e) => updateField('injury_details', e.target.value)}
                          className="bg-background/50"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  formData.has_surgery ? "border-primary bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏥</span>
                      <Label htmlFor="has_surgery" className="cursor-pointer font-medium">
                        Prodělal/a jsi operaci?
                      </Label>
                    </div>
                    <Checkbox
                      id="has_surgery"
                      checked={formData.has_surgery || false}
                      onCheckedChange={(v) => updateField('has_surgery', v)}
                    />
                  </div>
                  <AnimatePresence>
                    {formData.has_surgery && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <Input
                          placeholder="Jakou operaci? Kdy to bylo?"
                          value={formData.surgery_details || ''}
                          onChange={(e) => updateField('surgery_details', e.target.value)}
                          className="bg-background/50"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  formData.takes_medication ? "border-primary bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💊</span>
                      <Label htmlFor="takes_medication" className="cursor-pointer font-medium">
                        Bereš nějaké léky?
                      </Label>
                    </div>
                    <Checkbox
                      id="takes_medication"
                      checked={formData.takes_medication || false}
                      onCheckedChange={(v) => updateField('takes_medication', v)}
                    />
                  </div>
                  <AnimatePresence>
                    {formData.takes_medication && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <Input
                          placeholder="Jaké léky?"
                          value={formData.medication_details || ''}
                          onChange={(e) => updateField('medication_details', e.target.value)}
                          className="bg-background/50"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Pojďme si říct, kam směřujeme! Co je pro tebe nejdůležitější? 🎯
            </p>

            <div className="space-y-3">
              <Label className="text-base font-medium">Vyber svůj hlavní cíl</Label>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => updateField('main_goal', goal.value)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all text-center",
                      formData.main_goal === goal.value 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-xl block mb-1">{goal.emoji}</span>
                    <span className="text-sm">{goal.value}</span>
                  </button>
                ))}
              </div>
              <Input
                placeholder="Nebo napiš svůj vlastní cíl..."
                value={formData.main_goal_other || ''}
                onChange={(e) => updateField('main_goal_other', e.target.value)}
                className="bg-secondary/50 mt-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_preferences">❤️ Co tě na tréninku baví?</Label>
              <Textarea
                id="training_preferences"
                value={formData.training_preferences || ''}
                onChange={(e) => updateField('training_preferences', e.target.value)}
                placeholder="Co máš rád/a? Co ti vyhovuje? Jaký styl preferuješ?"
                className="bg-secondary/50 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="training_dislikes">👎 Čemu se chceš vyhnout?</Label>
              <Textarea
                id="training_dislikes"
                value={formData.training_dislikes || ''}
                onChange={(e) => updateField('training_dislikes', e.target.value)}
                placeholder="Co nemáš rád/a? Čeho se bojíš? Co ti nevyhovuje?"
                className="bg-secondary/50 min-h-[80px]"
              />
            </div>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Jsi skoro u konce! 🎉 Je ještě něco, co bych měl vědět?
            </p>

            <div className="space-y-2">
              <Label htmlFor="open_question" className="text-base font-medium">
                💭 Chceš mi ještě něco říct?
              </Label>
              <Textarea
                id="open_question"
                value={formData.open_question || ''}
                onChange={(e) => updateField('open_question', e.target.value)}
                placeholder="Cokoliv dalšího – obavy, očekávání, speciální požadavky, zdravotní omezení..."
                className="bg-secondary/50 min-h-[150px]"
              />
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-medium">Díky za vyplnění!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tvé odpovědi mi pomohou připravit trénink přesně pro tebe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = visibleSteps[currentStep];

  return (
    <div className="public-page pb-24">
      {/* Header with visual step indicator */}
      <div className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold">Dotazník před tréninkem</h1>
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
          
          {/* Visual step indicators */}
          <div className="flex items-center gap-1 mb-2">
            {visibleSteps.map((step, index) => (
              <div 
                key={step.id}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  index < currentStep ? "bg-primary" :
                  index === currentStep ? "bg-primary" : "bg-secondary"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentStepData.emoji} {currentStepData.title} • Krok {currentStep + 1} z {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="public-card mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    {currentStepData.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{currentStepData.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
                  </div>
                </div>
                {renderStep()}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
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
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Odesílám...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Odeslat 🎉
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="gap-2 flex-1 max-w-xs"
              size="lg"
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
