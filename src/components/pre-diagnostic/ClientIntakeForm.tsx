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
import { Switch } from '@/components/ui/switch';
import { 
  ChevronLeft, ChevronRight, Loader2, Send, Save, User, Briefcase, 
  Activity, Heart, Target, Plus, Trash2, AlertCircle, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

// Pain entry interface for structured pain data
export interface PainEntry {
  id: string;
  body_part: string;
  side: 'left' | 'right' | 'both';
  intensity: number;
  timing?: string;
  duration?: string;
  aggravators: string[];
  relievers: string[];
  note?: string;
}

export interface ClientIntakeData {
  // Identifikace
  name?: string;
  email?: string;
  phone?: string;
  
  // Základní údaje
  birth_year?: number;
  gender?: 'male' | 'female';
  height?: number;
  weight?: number;
  
  // Práce a životní styl
  work_type?: 'sedentary' | 'combined' | 'active' | 'physical';
  sitting_hours?: number;
  
  // Pohyb
  movement_frequency?: 'none' | '1-2' | '3-4' | '5+';
  
  // Spánek
  sleep_hours?: number;
  sleep_quality?: 1 | 2 | 3 | 4 | 5;
  stress_level?: 1 | 2 | 3 | 4 | 5;
  
  // Strava
  diet_quality?: 'good' | 'average' | 'chaotic';
  diet_note?: string;
  
  // Bolest / omezení - strukturované
  has_pain?: boolean;
  pain_entries?: PainEntry[];
  
  // Staré pole pro zpětnou kompatibilitu
  pain_areas?: string[];
  pain_note?: string;
  
  // Úrazy / operace
  has_injury?: boolean;
  injury_details?: string;
  has_surgery?: boolean;
  surgery_details?: string;
  
  // Zdraví
  health_notes?: string;
  
  // Cíle
  main_goal?: string;
  training_preference?: string;
  avoid_exercises?: string;
  biggest_problem?: string;
  
  // Doplnění
  additional_notes?: string;
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

const BODY_PARTS = [
  { value: 'neck', label: 'Krk' },
  { value: 'shoulder', label: 'Rameno' },
  { value: 'upper_back', label: 'Horní záda' },
  { value: 'lower_back', label: 'Bederní páteř' },
  { value: 'hip', label: 'Kyčel' },
  { value: 'knee', label: 'Koleno' },
  { value: 'ankle', label: 'Kotník' },
  { value: 'wrist', label: 'Zápěstí' },
  { value: 'elbow', label: 'Loket' },
  { value: 'other', label: 'Jiné' },
];

const TIMING_OPTIONS = [
  { value: 'during_exercise', label: 'Při zátěži' },
  { value: 'after_exercise', label: 'Po zátěži' },
  { value: 'morning', label: 'Ráno' },
  { value: 'evening', label: 'Večer' },
  { value: 'random', label: 'Náhodně' },
];

const DURATION_OPTIONS = [
  { value: 'days', label: 'Dny' },
  { value: 'weeks', label: 'Týdny' },
  { value: 'months', label: 'Měsíce' },
  { value: 'years', label: 'Roky' },
];

const AGGRAVATORS = ['sed', 'stání', 'chůze', 'běh', 'zvedání', 'rotace', 'předklon'];
const RELIEVERS = ['odpočinek', 'teplo', 'chlad', 'pohyb', 'protažení', 'léky'];

const GOALS = [
  'zhubnout', 'nabrat svaly', 'zlepšit kondici', 'zbavit se bolesti',
  'lepší pohyblivost', 'prevence zranění', 'sportovní výkon', 'celkové zdraví'
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
  const [editingPainId, setEditingPainId] = useState<string | null>(null);
  
  // Steps definition
  const STEPS = isNewClient 
    ? [
        { id: 'about', title: 'O vás', icon: User },
        { id: 'lifestyle', title: 'Životní styl', icon: Briefcase },
        { id: 'pain', title: 'Bolest a omezení', icon: Heart },
        { id: 'goals', title: 'Cíle', icon: Target },
      ]
    : [
        { id: 'about', title: 'Základní údaje', icon: User },
        { id: 'lifestyle', title: 'Životní styl', icon: Briefcase },
        { id: 'pain', title: 'Bolest a omezení', icon: Heart },
        { id: 'goals', title: 'Cíle', icon: Target },
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

  // Pain entry management
  const addPainEntry = useCallback(() => {
    const newEntry: PainEntry = {
      id: crypto.randomUUID(),
      body_part: '',
      side: 'both',
      intensity: 5,
      aggravators: [],
      relievers: [],
    };
    setFormData(prev => ({
      ...prev,
      pain_entries: [...(prev.pain_entries || []), newEntry],
    }));
    setEditingPainId(newEntry.id);
  }, [setFormData]);

  const updatePainEntry = useCallback((id: string, updates: Partial<PainEntry>) => {
    setFormData(prev => ({
      ...prev,
      pain_entries: (prev.pain_entries || []).map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      ),
    }));
  }, [setFormData]);

  const removePainEntry = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      pain_entries: (prev.pain_entries || []).filter(entry => entry.id !== id),
    }));
  }, [setFormData]);

  const togglePainArrayField = useCallback((id: string, field: 'aggravators' | 'relievers', value: string) => {
    setFormData(prev => ({
      ...prev,
      pain_entries: (prev.pain_entries || []).map(entry => {
        if (entry.id !== id) return entry;
        const arr = entry[field] || [];
        if (arr.includes(value)) {
          return { ...entry, [field]: arr.filter(v => v !== value) };
        }
        return { ...entry, [field]: [...arr, value] };
      }),
    }));
  }, [setFormData]);

  const canGoNext = () => {
    const step = STEPS[currentStep];
    if (step.id === 'about' && isNewClient) {
      return !!(formData.name && formData.email && formData.phone && formData.birth_year);
    }
    if (step.id === 'about' && !isNewClient) {
      return !!(formData.birth_year);
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

  // Render About step
  const renderAboutStep = () => (
    <div className="space-y-5">
      {/* Identifikace - pro nové klienty */}
      {isNewClient && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+420 777 123 456"
                className="bg-secondary/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Základní údaje */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label>Pohlaví</Label>
          <RadioGroup
            value={formData.gender || ''}
            onValueChange={(v) => updateField('gender', v as 'male' | 'female')}
            className="flex gap-2"
          >
            <div className={cn(
              "flex items-center space-x-2 p-3 rounded-lg flex-1 cursor-pointer transition-colors",
              formData.gender === 'male' ? "bg-primary/20 border border-primary" : "bg-secondary/50"
            )}>
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="cursor-pointer text-sm">Muž</Label>
            </div>
            <div className={cn(
              "flex items-center space-x-2 p-3 rounded-lg flex-1 cursor-pointer transition-colors",
              formData.gender === 'female' ? "bg-primary/20 border border-primary" : "bg-secondary/50"
            )}>
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="cursor-pointer text-sm">Žena</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Výška a váha */}
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
            min={100}
            max={250}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Váha (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={formData.weight || ''}
            onChange={(e) => updateField('weight', parseFloat(e.target.value) || undefined)}
            placeholder="75"
            className="bg-secondary/50"
            min={30}
            max={300}
            step={0.1}
          />
        </div>
      </div>
    </div>
  );

  // Render Lifestyle step
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

      {/* Sezení denně - slider */}
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
            <span className="font-medium text-foreground text-sm">{formData.sitting_hours ?? 6} hodin</span>
            <span>12h</span>
          </div>
        </div>
      </div>

      {/* Pohyb týdně - slider style */}
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

      {/* Spánek - slidery */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Moon className="w-4 h-4" />
          Spánek *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Průměr hodin</Label>
            <div className="px-2">
              <Slider
                value={[formData.sleep_hours ?? 7]}
                onValueChange={([v]) => updateField('sleep_hours', v)}
                max={10}
                min={4}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>4h</span>
                <span className="font-medium text-foreground">{formData.sleep_hours ?? 7}h</span>
                <span>10h</span>
              </div>
            </div>
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

      {/* Stres - slider */}
      <div className="space-y-3">
        <Label className="text-base">Úroveň stresu (volitelné)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => updateField('stress_level', n as 1 | 2 | 3 | 4 | 5)}
              className={cn(
                "flex-1 py-2 rounded-lg transition-colors text-sm font-medium",
                formData.stress_level === n
                  ? n <= 2 ? "bg-green-500 text-white" 
                    : n === 3 ? "bg-yellow-500 text-white"
                    : "bg-red-500 text-white"
                  : "bg-secondary/50 hover:bg-secondary/70"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Nízký</span>
          <span>Vysoký</span>
        </div>
      </div>
    </div>
  );

  // Render Pain step with structured entries
  const renderPainStep = () => (
    <div className="space-y-6">
      {/* Má bolest? */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Máš aktuálně bolest nebo omezení?
        </Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateField('has_pain', false)}
            className={cn(
              "flex-1 p-4 rounded-lg transition-colors text-center font-medium",
              formData.has_pain === false 
                ? "bg-green-500/20 border-2 border-green-500 text-green-700" 
                : "bg-secondary/50 hover:bg-secondary/70"
            )}
          >
            Ne, nic mě nebolí
          </button>
          <button
            type="button"
            onClick={() => {
              updateField('has_pain', true);
              if (!formData.pain_entries?.length) {
                addPainEntry();
              }
            }}
            className={cn(
              "flex-1 p-4 rounded-lg transition-colors text-center font-medium",
              formData.has_pain === true 
                ? "bg-destructive/20 border-2 border-destructive text-destructive" 
                : "bg-secondary/50 hover:bg-secondary/70"
            )}
          >
            Ano, mám bolest
          </button>
        </div>
      </div>

      {/* Pain entries */}
      {formData.has_pain && (
        <div className="space-y-4 border-l-2 border-destructive/30 pl-4">
          {(formData.pain_entries || []).map((entry, index) => (
            <div 
              key={entry.id} 
              className="p-4 rounded-xl bg-secondary/30 border border-border space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Bolest #{index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removePainEntry(entry.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Partie těla */}
              <div className="space-y-2">
                <Label className="text-sm">Kde?</Label>
                <div className="flex flex-wrap gap-2">
                  {BODY_PARTS.map((part) => (
                    <Badge
                      key={part.value}
                      variant={entry.body_part === part.value ? 'destructive' : 'outline'}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => updatePainEntry(entry.id, { body_part: part.value })}
                    >
                      {part.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Strana */}
              <div className="space-y-2">
                <Label className="text-sm">Strana</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'left', label: 'Levá' },
                    { value: 'right', label: 'Pravá' },
                    { value: 'both', label: 'Obě' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updatePainEntry(entry.id, { side: opt.value as PainEntry['side'] })}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-sm transition-colors",
                        entry.side === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 hover:bg-secondary/70"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intenzita */}
              <div className="space-y-2">
                <Label className="text-sm">Intenzita: {entry.intensity}/10</Label>
                <Slider
                  value={[entry.intensity]}
                  onValueChange={([v]) => updatePainEntry(entry.id, { intensity: v })}
                  max={10}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mírná</span>
                  <span>Silná</span>
                </div>
              </div>

              {/* Timing & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Kdy bolí?</Label>
                  <div className="flex flex-wrap gap-1">
                    {TIMING_OPTIONS.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={entry.timing === opt.value ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => updatePainEntry(entry.id, { timing: opt.value })}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Jak dlouho?</Label>
                  <div className="flex flex-wrap gap-1">
                    {DURATION_OPTIONS.map((opt) => (
                      <Badge
                        key={opt.value}
                        variant={entry.duration === opt.value ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => updatePainEntry(entry.id, { duration: opt.value })}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aggravators & Relievers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-destructive/80">Zhoršuje</Label>
                  <div className="flex flex-wrap gap-1">
                    {AGGRAVATORS.map((item) => (
                      <Badge
                        key={item}
                        variant={entry.aggravators.includes(item) ? 'destructive' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => togglePainArrayField(entry.id, 'aggravators', item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-green-600">Ulevuje</Label>
                  <div className="flex flex-wrap gap-1">
                    {RELIEVERS.map((item) => (
                      <Badge
                        key={item}
                        variant={entry.relievers.includes(item) ? 'default' : 'outline'}
                        className={cn(
                          "cursor-pointer text-xs",
                          entry.relievers.includes(item) && "bg-green-500 hover:bg-green-600"
                        )}
                        onClick={() => togglePainArrayField(entry.id, 'relievers', item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Poznámka */}
              <div className="space-y-2">
                <Label className="text-sm">Poznámka</Label>
                <Input
                  value={entry.note || ''}
                  onChange={(e) => updatePainEntry(entry.id, { note: e.target.value })}
                  placeholder="Např. bolí hlavně po probuzení..."
                  className="bg-background/50"
                />
              </div>
            </div>
          ))}

          {/* Add more button */}
          <Button
            type="button"
            variant="outline"
            onClick={addPainEntry}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Přidat další bolest/omezení
          </Button>
        </div>
      )}

      {/* Úrazy */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Měl/a jsi nějaký úraz?</Label>
          <Switch
            checked={formData.has_injury || false}
            onCheckedChange={(v) => updateField('has_injury', v)}
          />
        </div>
        {formData.has_injury && (
          <Textarea
            value={formData.injury_details || ''}
            onChange={(e) => updateField('injury_details', e.target.value)}
            placeholder="Partie, rok, stručný popis..."
            className="bg-secondary/50 min-h-[60px]"
          />
        )}
      </div>

      {/* Operace */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Prodělal/a jsi operaci?</Label>
          <Switch
            checked={formData.has_surgery || false}
            onCheckedChange={(v) => updateField('has_surgery', v)}
          />
        </div>
        {formData.has_surgery && (
          <Textarea
            value={formData.surgery_details || ''}
            onChange={(e) => updateField('surgery_details', e.target.value)}
            placeholder="Typ operace, rok, stručný popis..."
            className="bg-secondary/50 min-h-[60px]"
          />
        )}
      </div>

      {/* Zdravotní omezení */}
      <div className="space-y-2">
        <Label htmlFor="health_notes">Další zdravotní omezení</Label>
        <Textarea
          id="health_notes"
          value={formData.health_notes || ''}
          onChange={(e) => updateField('health_notes', e.target.value)}
          placeholder="Cokoliv důležitého - alergie, chronické nemoci, léky..."
          className="bg-secondary/50 min-h-[60px]"
        />
      </div>
    </div>
  );

  // Render Goals step
  const renderGoalsStep = () => (
    <div className="space-y-6">
      {/* Hlavní cíl */}
      <div className="space-y-3">
        <Label className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          Co chceš zlepšit?
        </Label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <Badge
              key={goal}
              variant={formData.main_goal === goal ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5"
              onClick={() => updateField('main_goal', goal)}
            >
              {goal}
            </Badge>
          ))}
        </div>
        <Input
          value={formData.main_goal && !GOALS.includes(formData.main_goal) ? formData.main_goal : ''}
          onChange={(e) => updateField('main_goal', e.target.value)}
          placeholder="Nebo napiš vlastní cíl..."
          className="bg-secondary/50"
        />
      </div>

      {/* Biggest problem */}
      <div className="space-y-2">
        <Label htmlFor="biggest_problem">Co je pro tebe teď největší problém?</Label>
        <Input
          id="biggest_problem"
          value={formData.biggest_problem || ''}
          onChange={(e) => updateField('biggest_problem', e.target.value)}
          placeholder="Např. nemám čas, bolí mě záda při cvičení..."
          className="bg-secondary/50"
        />
      </div>

      {/* Preference tréninku */}
      <div className="space-y-2">
        <Label htmlFor="training_preference">Jaký trénink preferuješ? (volitelné)</Label>
        <Input
          id="training_preference"
          value={formData.training_preference || ''}
          onChange={(e) => updateField('training_preference', e.target.value)}
          placeholder="Např. raději silový, nesnáším běhání..."
          className="bg-secondary/50"
        />
      </div>

      {/* Čemu se vyhnout */}
      <div className="space-y-2">
        <Label htmlFor="avoid_exercises">Čemu se chceš vyhnout? (volitelné)</Label>
        <Input
          id="avoid_exercises"
          value={formData.avoid_exercises || ''}
          onChange={(e) => updateField('avoid_exercises', e.target.value)}
          placeholder="Např. běh, dřepy s činkou..."
          className="bg-secondary/50"
        />
      </div>

      {/* Additional notes */}
      <div className="space-y-2">
        <Label htmlFor="additional_notes">Je něco, co bych měl vědět?</Label>
        <Textarea
          id="additional_notes"
          value={formData.additional_notes || ''}
          onChange={(e) => updateField('additional_notes', e.target.value)}
          placeholder="Omezení, obavy, očekávání, cokoliv důležitého..."
          className="bg-secondary/50 min-h-[80px]"
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
      case 'pain':
        return renderPainStep();
      case 'goals':
        return renderGoalsStep();
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
        <div className="container mx-auto px-4 py-4 max-w-2xl">
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
      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 max-w-2xl">
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
