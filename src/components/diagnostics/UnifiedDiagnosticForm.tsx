import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { 
  User, Briefcase, Activity, Heart, Target, ChevronRight, ChevronDown,
  Loader2, Save, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Schema for the unified diagnostic form
const unifiedDiagnosticSchema = z.object({
  // Step 1: Basic Info
  clientName: z.string().min(2, 'Jméno je povinné'),
  clientEmail: z.string().email('Zadejte platný email').optional().or(z.literal('')),
  clientBirthDate: z.string().optional(),
  clientGender: z.enum(['male', 'female', '']).optional(),
  height: z.number().min(100).max(250).optional().nullable(),
  weight: z.number().min(30).max(300).optional().nullable(),
  
  // Step 2: Lifestyle
  occupation: z.string().max(100).optional(),
  workType: z.enum(['sedentary', 'mixed', 'active', '']).optional(),
  sittingHoursDaily: z.number().min(0).max(24).optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  sleepQuality: z.number().min(1).max(5).optional().nullable(),
  stressLevel: z.number().min(1).max(5).optional().nullable(),
  
  // Step 3: Movement & Activity
  exerciseFrequency: z.enum(['none', '1-2x', '3-4x', '5+', '']).optional(),
  sportsHistory: z.string().max(500).optional(),
  currentActivities: z.array(z.string()).optional(),
  
  // Step 4: Health
  healthIssues: z.string().max(1000).optional(),
  injuries: z.string().max(1000).optional(),
  surgeries: z.string().max(1000).optional(),
  painAreas: z.array(z.string()).optional(),
  painDescription: z.string().max(1000).optional(),
  
  // Step 5: Goals
  primaryGoal: z.string().max(500).optional(),
  secondaryGoals: z.string().max(500).optional(),
  whatDoesntWork: z.string().max(500).optional(),
  
  // Advanced: Mobility (trainer mode)
  mobilityShoulders: z.enum(['ok', 'limited', 'painful', '']).optional(),
  mobilityHips: z.enum(['ok', 'limited', 'painful', '']).optional(),
  mobilityAnkles: z.enum(['ok', 'limited', 'painful', '']).optional(),
  mobilityThoracic: z.enum(['ok', 'limited', 'painful', '']).optional(),
  
  // Advanced: Movement Quality (trainer mode)
  squatQuality: z.enum(['good', 'limited', 'poor', '']).optional(),
  lungeQuality: z.enum(['good', 'limited', 'poor', '']).optional(),
  hipHingeQuality: z.enum(['good', 'limited', 'poor', '']).optional(),
  pushQuality: z.enum(['good', 'limited', 'poor', '']).optional(),
  pullQuality: z.enum(['good', 'limited', 'poor', '']).optional(),
  
  // Advanced: Trainer Notes (trainer mode only)
  trainerPriorities: z.string().max(2000).optional(),
  trainerLimitations: z.string().max(2000).optional(),
  trainerRisks: z.string().max(2000).optional(),
  trainerNotes: z.string().max(2000).optional(),
});

export type UnifiedDiagnosticData = z.infer<typeof unifiedDiagnosticSchema>;

interface UnifiedDiagnosticFormProps {
  mode: 'trainer' | 'client';
  defaultValues?: Partial<UnifiedDiagnosticData>;
  onSubmit: (data: UnifiedDiagnosticData) => Promise<void>;
  isLoading?: boolean;
  clientName?: string; // Pre-filled for existing clients
}

const STEPS = [
  { id: 'basic', label: 'Základní údaje', icon: User, description: 'Jméno, věk, výška, váha' },
  { id: 'lifestyle', label: 'Životní styl', icon: Briefcase, description: 'Práce, spánek, stres' },
  { id: 'activity', label: 'Pohyb', icon: Activity, description: 'Sport a aktivita' },
  { id: 'health', label: 'Zdraví', icon: Heart, description: 'Zdravotní stav, bolesti' },
  { id: 'goals', label: 'Cíle', icon: Target, description: 'Co chcete dosáhnout' },
];

const PAIN_AREA_OPTIONS = [
  { value: 'neck', label: 'Krk' },
  { value: 'shoulder', label: 'Rameno' },
  { value: 'upper_back', label: 'Horní záda' },
  { value: 'lower_back', label: 'Dolní záda' },
  { value: 'hip', label: 'Kyčel' },
  { value: 'knee', label: 'Koleno' },
  { value: 'ankle', label: 'Kotník' },
  { value: 'wrist', label: 'Zápěstí' },
  { value: 'elbow', label: 'Loket' },
];

const ACTIVITY_OPTIONS = [
  'Běh', 'Plavání', 'Cyklistika', 'Posilovna', 'Jóga', 'Pilates',
  'Tenis', 'Fotbal', 'Basketbal', 'CrossFit', 'HIIT', 'Chůze'
];

export function UnifiedDiagnosticForm({
  mode,
  defaultValues,
  onSubmit,
  isLoading,
  clientName,
}: UnifiedDiagnosticFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(mode === 'trainer');
  
  const form = useForm<UnifiedDiagnosticData>({
    resolver: zodResolver(unifiedDiagnosticSchema),
    defaultValues: {
      clientName: clientName || '',
      clientEmail: '',
      clientGender: '',
      sleepQuality: 3,
      stressLevel: 3,
      painAreas: [],
      currentActivities: [],
      ...defaultValues,
    },
  });

  const handleNext = async () => {
    const fieldsToValidate = getStepFields(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const getStepFields = (step: number): (keyof UnifiedDiagnosticData)[] => {
    switch (step) {
      case 0: return ['clientName', 'clientEmail', 'clientBirthDate', 'clientGender', 'height', 'weight'];
      case 1: return ['occupation', 'workType', 'sittingHoursDaily', 'sleepHours', 'sleepQuality', 'stressLevel'];
      case 2: return ['exerciseFrequency', 'sportsHistory', 'currentActivities'];
      case 3: return ['healthIssues', 'injuries', 'surgeries', 'painAreas', 'painDescription'];
      case 4: return ['primaryGoal', 'secondaryGoals', 'whatDoesntWork'];
      default: return [];
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const togglePainArea = (area: string) => {
    const current = form.getValues('painAreas') || [];
    if (current.includes(area)) {
      form.setValue('painAreas', current.filter(a => a !== area));
    } else {
      form.setValue('painAreas', [...current, area]);
    }
  };

  const toggleActivity = (activity: string) => {
    const current = form.getValues('currentActivities') || [];
    if (current.includes(activity)) {
      form.setValue('currentActivities', current.filter(a => a !== activity));
    } else {
      form.setValue('currentActivities', [...current, activity]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Krok {currentStep + 1} z {STEPS.length}</span>
            <span className="font-medium">{STEPS[currentStep].label}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => index <= currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-success/10 text-success cursor-pointer",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = STEPS[currentStep].icon;
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  {STEPS[currentStep].label}
                </CardTitle>
                <CardDescription>{STEPS[currentStep].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Basic Info */}
                {currentStep === 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jméno a příjmení *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jan Novák" {...field} disabled={!!clientName} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {mode === 'client' && (
                      <FormField
                        control={form.control}
                        name="clientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="jan@email.cz" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="clientBirthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datum narození</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clientGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pohlaví</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Výška (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="175"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Váha (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="75"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Step 2: Lifestyle */}
                {currentStep === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Povolání</FormLabel>
                          <FormControl>
                            <Input placeholder="např. Programátor, Učitel, Prodavač..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="workType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ práce</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-3 gap-2"
                            >
                              {[
                                { value: 'sedentary', label: 'Sedavá' },
                                { value: 'mixed', label: 'Kombinovaná' },
                                { value: 'active', label: 'Aktivní' },
                              ].map(option => (
                                <div key={option.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option.value} id={option.value} />
                                  <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sittingHoursDaily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kolik hodin denně sedíte? {field.value ?? 0} h</FormLabel>
                          <FormControl>
                            <Slider
                              min={0}
                              max={16}
                              step={1}
                              value={[field.value ?? 0]}
                              onValueChange={([val]) => field.onChange(val)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sleepHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Průměrná délka spánku: {field.value ?? 7} h</FormLabel>
                          <FormControl>
                            <Slider
                              min={4}
                              max={12}
                              step={0.5}
                              value={[field.value ?? 7]}
                              onValueChange={([val]) => field.onChange(val)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sleepQuality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kvalita spánku</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => field.onChange(val)}
                                  className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-all",
                                    field.value === val 
                                      ? "border-primary bg-primary text-primary-foreground" 
                                      : "border-border hover:border-primary/50"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                              <span className="text-sm text-muted-foreground ml-2">
                                {field.value === 1 ? 'Špatná' : field.value === 5 ? 'Výborná' : ''}
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stressLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Úroveň stresu</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => field.onChange(val)}
                                  className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-all",
                                    field.value === val 
                                      ? "border-warning bg-warning text-warning-foreground" 
                                      : "border-border hover:border-warning/50"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                              <span className="text-sm text-muted-foreground ml-2">
                                {field.value === 1 ? 'Nízký' : field.value === 5 ? 'Vysoký' : ''}
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 3: Activity */}
                {currentStep === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="exerciseFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jak často cvičíte?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-2"
                            >
                              {[
                                { value: 'none', label: 'Necvičím' },
                                { value: '1-2x', label: '1-2× týdně' },
                                { value: '3-4x', label: '3-4× týdně' },
                                { value: '5+', label: '5+ týdně' },
                              ].map(option => (
                                <div key={option.value} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50">
                                  <RadioGroupItem value={option.value} id={`freq-${option.value}`} />
                                  <Label htmlFor={`freq-${option.value}`} className="text-sm cursor-pointer flex-1">
                                    {option.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currentActivities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aktuální aktivity</FormLabel>
                          <FormDescription>Vyberte nebo přidejte vlastní</FormDescription>
                          <FormControl>
                            <div className="flex flex-wrap gap-2">
                              {ACTIVITY_OPTIONS.map(activity => {
                                const isSelected = (field.value || []).includes(activity);
                                return (
                                  <Badge
                                    key={activity}
                                    variant={isSelected ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-primary/80"
                                    onClick={() => toggleActivity(activity)}
                                  >
                                    {activity}
                                  </Badge>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sportsHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sportovní historie</FormLabel>
                          <FormDescription>Jaké sporty jste dělal/a v minulosti?</FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="např. 10 let fotbal, 5 let plavání..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 4: Health */}
                {currentStep === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="painAreas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            Oblasti s bolestí nebo omezením
                          </FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-2">
                              {PAIN_AREA_OPTIONS.map(area => {
                                const isSelected = (field.value || []).includes(area.value);
                                return (
                                  <Badge
                                    key={area.value}
                                    variant={isSelected ? "destructive" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => togglePainArea(area.value)}
                                  >
                                    {area.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {(form.watch('painAreas')?.length ?? 0) > 0 && (
                      <FormField
                        control={form.control}
                        name="painDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Popište bolest podrobněji</FormLabel>
                            <FormDescription>Kdy bolí, co ji zhoršuje, jak dlouho to trvá...</FormDescription>
                            <FormControl>
                              <Textarea 
                                placeholder="např. Bolí koleno při chůzi ze schodů, začalo před 3 měsíci..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="injuries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Úrazy v minulosti</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Zlomený kotník 2019, vyhřezlá ploténka L4/L5..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="surgeries"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operace</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Plastika předního zkříženého vazu 2020..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="healthIssues"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zdravotní problémy a omezení</FormLabel>
                          <FormDescription>Chronické nemoci, alergie, léky...</FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Vysoký krevní tlak, cukrovka, astma..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 5: Goals */}
                {currentStep === 4 && (
                  <>
                    <FormField
                      control={form.control}
                      name="primaryGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hlavní cíl *</FormLabel>
                          <FormDescription>Co je váš primární cíl tréninku?</FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Zhubnout 10 kg, získat sílu, zbavit se bolesti zad..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="secondaryGoals"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vedlejší cíle</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Zlepšit kondici, naučit se správně cvičit..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="whatDoesntWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Co vám dosud nefungovalo?</FormLabel>
                          <FormDescription>Co jste zkoušeli a nepomohlo?</FormDescription>
                          <FormControl>
                            <Textarea 
                              placeholder="např. Diety jo-jo efekt, fitness centrum bez výsledků..."
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Advanced Sections (Trainer Mode) */}
        {mode === 'trainer' && currentStep === STEPS.length - 1 && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Pokročilé hodnocení (trenér)
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Mobility Assessment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mobilita</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'mobilityShoulders' as const, label: 'Ramena' },
                    { name: 'mobilityHips' as const, label: 'Kyčle' },
                    { name: 'mobilityAnkles' as const, label: 'Kotníky' },
                    { name: 'mobilityThoracic' as const, label: 'Hrudní páteř' },
                  ].map(item => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{item.label}</FormLabel>
                          <FormControl>
                            <div className="flex gap-1">
                              {[
                                { value: 'ok', label: 'OK', color: 'bg-success/20 text-success border-success/30' },
                                { value: 'limited', label: 'Omezená', color: 'bg-warning/20 text-warning border-warning/30' },
                                { value: 'painful', label: 'Bolestivá', color: 'bg-destructive/20 text-destructive border-destructive/30' },
                              ].map(option => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  className={cn(
                                    "px-2 py-1 text-xs rounded border transition-all",
                                    field.value === option.value ? option.color : "border-border hover:bg-muted"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Movement Quality */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Kvalita pohybu</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'squatQuality' as const, label: 'Dřep' },
                    { name: 'lungeQuality' as const, label: 'Výpad' },
                    { name: 'hipHingeQuality' as const, label: 'Hip hinge' },
                    { name: 'pushQuality' as const, label: 'Tlak' },
                    { name: 'pullQuality' as const, label: 'Tah' },
                  ].map(item => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{item.label}</FormLabel>
                          <FormControl>
                            <div className="flex gap-1">
                              {[
                                { value: 'good', label: 'Dobrá', color: 'bg-success/20 text-success border-success/30' },
                                { value: 'limited', label: 'Omezená', color: 'bg-warning/20 text-warning border-warning/30' },
                                { value: 'poor', label: 'Špatná', color: 'bg-destructive/20 text-destructive border-destructive/30' },
                              ].map(option => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => field.onChange(option.value)}
                                  className={cn(
                                    "px-2 py-1 text-xs rounded border transition-all",
                                    field.value === option.value ? option.color : "border-border hover:bg-muted"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Trainer Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trenérské poznámky</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trainerPriorities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Priority tréninku</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Na co se zaměřit..." className="min-h-[60px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trainerLimitations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Omezení</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Co nedělat..." className="min-h-[60px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trainerRisks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Rizika</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Na co si dát pozor..." className="min-h-[60px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trainerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Další poznámky</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Cokoliv dalšího..." className="min-h-[60px]" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět
          </Button>
          
          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Další
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {mode === 'client' ? 'Odeslat' : 'Uložit diagnostiku'}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
