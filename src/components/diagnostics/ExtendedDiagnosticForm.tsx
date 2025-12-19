import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  User, Heart, Target, Activity, Brain, Apple, 
  Camera, Sparkles, AlertTriangle, CheckCircle, Loader2,
  Plus, X, ChevronRight, Save, FileText, ClipboardCheck,
  TrendingUp, TrendingDown, Minus, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useDiagnosticAI, FinalSummaryResult } from '@/hooks/useDiagnosticAI';
import { DiagnosticAssessment } from '@/hooks/useDiagnosticAssessment';
import {
  DiagnosticLevel,
  DIAGNOSTIC_LEVELS,
  MOBILITY_OPTIONS,
  PAIN_OPTIONS,
  SIDE_OPTIONS,
  PAIN_DURATION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  TRAINING_STYLES,
  REGENERATION_METHODS,
  EATING_REGULARITY_OPTIONS,
  TABS_CONFIG,
  MOBILITY_AREAS,
  MOVEMENT_QUALITY_AREAS,
  PAIN_AREAS,
} from './diagnosticConstants';

interface ExtendedDiagnosticFormProps {
  clients: Client[];
  defaultClientId?: string;
  onSubmit: (data: ExtendedDiagnosticData) => Promise<void>;
  onClientCreate?: (clientData: Partial<Client>) => Promise<string>;
  isLoading?: boolean;
  previousAssessment?: DiagnosticAssessment | null;
}

export interface ExtendedDiagnosticData {
  // Diagnostic level
  diagnosticLevel: DiagnosticLevel;
  
  // Client identification
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientBirthDate?: string;
  clientGender?: string;
  
  // Personal Info
  handedness: string;
  occupation: string;
  sittingHoursDaily: number;
  
  // Lifestyle
  sportsHistory: string;
  currentActivities: string[];
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  regenerationMethods: string[];
  meditates: boolean;
  
  // Health
  diseases: string[];
  surgeries: string[];
  injuries: string[];
  painAreas: string[];
  allergies: string[];
  familyHealthHistory: string;
  
  // Goals
  shortTermGoals: string;
  longTermGoals: string;
  trainingPriorities: string[];
  
  // Mobility Assessment with side and notes
  mobilityAnkles: string;
  mobilityAnklesSide: string;
  mobilityAnklesNote: string;
  mobilityHips: string;
  mobilityHipsSide: string;
  mobilityHipsNote: string;
  mobilityThoracic: string;
  mobilityThoracicSide: string;
  mobilityThoracicNote: string;
  mobilityShoulders: string;
  mobilityShouldersSide: string;
  mobilityShouldersNote: string;
  coreStability: string;
  coreStabilityNote: string;
  
  // Movement Quality with side and notes
  squatQuality: string;
  squatSide: string;
  squatNote: string;
  lungeQuality: string;
  lungeSide: string;
  lungeNote: string;
  pushQuality: string;
  pushSide: string;
  pushNote: string;
  pullQuality: string;
  pullSide: string;
  pullNote: string;
  hipHingeQuality: string;
  hipHingeSide: string;
  hipHingeNote: string;
  
  // Pain Screening with duration, trigger, side
  painAnkle: string;
  painAnkleDuration: string;
  painAnkleTrigger: string[];
  painAnkleSide: string;
  painKnee: string;
  painKneeDuration: string;
  painKneeTrigger: string[];
  painKneeSide: string;
  painHip: string;
  painHipDuration: string;
  painHipTrigger: string[];
  painHipSide: string;
  painSi: string;
  painSiDuration: string;
  painSiTrigger: string[];
  painSiSide: string;
  painLumbar: string;
  painLumbarDuration: string;
  painLumbarTrigger: string[];
  painLumbarSide: string;
  painThoracic: string;
  painThoracicDuration: string;
  painThoracicTrigger: string[];
  painThoracicSide: string;
  painShoulder: string;
  painShoulderDuration: string;
  painShoulderTrigger: string[];
  painShoulderSide: string;
  painNeck: string;
  painNeckDuration: string;
  painNeckTrigger: string[];
  painNeckSide: string;
  
  // Psychological - simplified
  preferredTrainingStyle: string;
  trainingBarrier: string;
  
  // Nutrition - simplified
  eatingRegularity: string;
  allRestrictions: string[];
  supplements: string[];
  
  // Structured trainer notes
  trainerRisks: string;
  trainerPriorities: string;
  trainerLimitations: string;
  trainerOtherNotes: string;
  
  // AI Results
  aiAnalysis?: FinalSummaryResult;
  
  // Media
  mediaUrls?: string[];
}

const defaultFormData: ExtendedDiagnosticData = {
  diagnosticLevel: 'functional',
  handedness: 'right',
  occupation: '',
  sittingHoursDaily: 0,
  sportsHistory: '',
  currentActivities: [],
  sleepHours: 7,
  sleepQuality: 3,
  stressLevel: 3,
  regenerationMethods: [],
  meditates: false,
  diseases: [],
  surgeries: [],
  injuries: [],
  painAreas: [],
  allergies: [],
  familyHealthHistory: '',
  shortTermGoals: '',
  longTermGoals: '',
  trainingPriorities: [],
  // Mobility
  mobilityAnkles: 'ok',
  mobilityAnklesSide: '',
  mobilityAnklesNote: '',
  mobilityHips: 'ok',
  mobilityHipsSide: '',
  mobilityHipsNote: '',
  mobilityThoracic: 'ok',
  mobilityThoracicSide: '',
  mobilityThoracicNote: '',
  mobilityShoulders: 'ok',
  mobilityShouldersSide: '',
  mobilityShouldersNote: '',
  coreStability: 'ok',
  coreStabilityNote: '',
  // Movement quality
  squatQuality: 'ok',
  squatSide: '',
  squatNote: '',
  lungeQuality: 'ok',
  lungeSide: '',
  lungeNote: '',
  pushQuality: 'ok',
  pushSide: '',
  pushNote: '',
  pullQuality: 'ok',
  pullSide: '',
  pullNote: '',
  hipHingeQuality: 'ok',
  hipHingeSide: '',
  hipHingeNote: '',
  // Pain
  painAnkle: 'none',
  painAnkleDuration: '',
  painAnkleTrigger: [],
  painAnkleSide: '',
  painKnee: 'none',
  painKneeDuration: '',
  painKneeTrigger: [],
  painKneeSide: '',
  painHip: 'none',
  painHipDuration: '',
  painHipTrigger: [],
  painHipSide: '',
  painSi: 'none',
  painSiDuration: '',
  painSiTrigger: [],
  painSiSide: '',
  painLumbar: 'none',
  painLumbarDuration: '',
  painLumbarTrigger: [],
  painLumbarSide: '',
  painThoracic: 'none',
  painThoracicDuration: '',
  painThoracicTrigger: [],
  painThoracicSide: '',
  painShoulder: 'none',
  painShoulderDuration: '',
  painShoulderTrigger: [],
  painShoulderSide: '',
  painNeck: 'none',
  painNeckDuration: '',
  painNeckTrigger: [],
  painNeckSide: '',
  // Psychology
  preferredTrainingStyle: '',
  trainingBarrier: '',
  // Nutrition
  eatingRegularity: '',
  allRestrictions: [],
  supplements: [],
  // Trainer notes
  trainerRisks: '',
  trainerPriorities: '',
  trainerLimitations: '',
  trainerOtherNotes: '',
};

// Helper to get trend indicator
function TrendIndicator({ current, previous, field }: { current: string; previous?: string; field: string }) {
  if (!previous || current === previous) return null;
  
  const isImproved = (current === 'ok' && previous !== 'ok') || 
                     (current === 'none' && previous !== 'none') ||
                     (current === 'limited' && previous === 'painful') ||
                     (current === 'mild' && previous === 'significant');
  
  const isWorse = (current !== 'ok' && previous === 'ok') ||
                  (current !== 'none' && previous === 'none') ||
                  (current === 'painful' && previous !== 'painful') ||
                  (current === 'significant' && previous !== 'significant');

  if (isImproved) {
    return <TrendingUp className="w-3 h-3 text-success inline ml-1" />;
  }
  if (isWorse) {
    return <TrendingDown className="w-3 h-3 text-destructive inline ml-1" />;
  }
  return <Minus className="w-3 h-3 text-muted-foreground inline ml-1" />;
}

export function ExtendedDiagnosticForm({
  clients,
  defaultClientId,
  onSubmit,
  onClientCreate,
  isLoading,
  previousAssessment,
}: ExtendedDiagnosticFormProps) {
  const [formData, setFormData] = useState<ExtendedDiagnosticData>({
    ...defaultFormData,
    clientId: defaultClientId,
  });
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [tempInput, setTempInput] = useState<Record<string, string>>({});
  const [mediaFiles, setMediaFiles] = useState<Array<{
    id: string;
    file: File;
    preview: string;
    viewType?: string;
  }>>([]);
  const [showAISection, setShowAISection] = useState(false);

  const { 
    isAnalyzing, 
    formHints, 
    finalSummary,
    analyzeFormData, 
    generateFinalSummary 
  } = useDiagnosticAI();

  // Get available tabs based on diagnostic level
  const availableTabs = TABS_CONFIG[formData.diagnosticLevel] || TABS_CONFIG.functional;
  
  // Set initial tab when level changes
  useEffect(() => {
    if (!activeTab || !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [formData.diagnosticLevel, availableTabs, activeTab]);

  const updateField = useCallback(<K extends keyof ExtendedDiagnosticData>(
    field: K, 
    value: ExtendedDiagnosticData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addToArray = useCallback((field: keyof ExtendedDiagnosticData, value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), value.trim()]
    }));
    setTempInput(prev => ({ ...prev, [field]: '' }));
  }, []);

  const removeFromArray = useCallback((field: keyof ExtendedDiagnosticData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  }, []);

  const toggleArrayItem = useCallback((field: keyof ExtendedDiagnosticData, value: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  }, []);

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      updateField('clientId', clientId);
      updateField('clientName', client.name);
      updateField('clientEmail', client.email || '');
      updateField('clientGender', client.gender || '');
      updateField('clientBirthDate', client.birth_date || '');
      setIsNewClient(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, viewType?: string) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles(prev => {
          if (viewType) {
            const filtered = prev.filter(m => m.viewType !== viewType);
            return [...filtered, {
              id: crypto.randomUUID(),
              file,
              preview: reader.result as string,
              viewType
            }];
          }
          return [...prev, {
            id: crypto.randomUUID(),
            file,
            preview: reader.result as string
          }];
        });
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  };

  const removeMediaFile = (id: string) => {
    setMediaFiles(prev => prev.filter(m => m.id !== id));
  };

  const handleGenerateSummary = async () => {
    const summary = await generateFinalSummary({
      clientName: formData.clientName,
      gender: formData.clientGender,
      handedness: formData.handedness,
      occupation: formData.occupation,
      sittingHours: formData.sittingHoursDaily,
      sportsHistory: formData.sportsHistory,
      currentActivities: formData.currentActivities,
      sleepHours: formData.sleepHours,
      sleepQuality: formData.sleepQuality,
      stressLevel: formData.stressLevel,
      diseases: formData.diseases,
      surgeries: formData.surgeries,
      injuries: formData.injuries,
      painAreas: formData.painAreas,
      allergies: formData.allergies,
      shortTermGoals: formData.shortTermGoals,
      longTermGoals: formData.longTermGoals,
      mobilityAnkles: formData.mobilityAnkles,
      mobilityHips: formData.mobilityHips,
      mobilityThoracic: formData.mobilityThoracic,
      mobilityShoulders: formData.mobilityShoulders,
      coreStability: formData.coreStability,
      squatQuality: formData.squatQuality,
      lungeQuality: formData.lungeQuality,
      pushQuality: formData.pushQuality,
      pullQuality: formData.pullQuality,
      hipHingeQuality: formData.hipHingeQuality,
      painAnkle: formData.painAnkle,
      painKnee: formData.painKnee,
      painHip: formData.painHip,
      painSi: formData.painSi,
      painLumbar: formData.painLumbar,
      painThoracic: formData.painThoracic,
      painShoulder: formData.painShoulder,
      painNeck: formData.painNeck,
      preferredTrainingStyle: formData.preferredTrainingStyle,
      eatingRegularity: formData.eatingRegularity,
      supplements: formData.supplements,
      dietaryRestrictions: formData.allRestrictions,
      trainerNotes: `Rizika: ${formData.trainerRisks}\nPriority: ${formData.trainerPriorities}\nOmezení: ${formData.trainerLimitations}\nPoznámky: ${formData.trainerOtherNotes}`,
    });
    
    if (summary) {
      updateField('aiAnalysis', summary);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const tabsConfig = [
    { id: 'client', label: 'Klient', icon: User },
    { id: 'lifestyle', label: 'Životní styl', icon: Activity },
    { id: 'health', label: 'Zdraví', icon: Heart },
    { id: 'goals', label: 'Cíle', icon: Target },
    { id: 'mobility', label: 'Mobilita', icon: Activity },
    { id: 'pain', label: 'Bolest', icon: AlertTriangle },
    { id: 'psychology', label: 'Psychika', icon: Brain },
    { id: 'nutrition', label: 'Strava', icon: Apple },
    { id: 'media', label: 'Foto/Video', icon: Camera },
    { id: 'conclusion', label: 'Závěr', icon: ClipboardCheck },
  ];

  const visibleTabs = tabsConfig.filter(tab => availableTabs.includes(tab.id));

  // Get previous value for trend display
  const getPreviousValue = (field: string) => {
    if (!previousAssessment) return undefined;
    return (previousAssessment as any)[field];
  };

  return (
    <div className="space-y-4">
      {/* Diagnostic Level Selector */}
      <Card className="glass p-4">
        <h3 className="font-medium mb-3">Typ diagnostiky</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DIAGNOSTIC_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => updateField('diagnosticLevel', level.value)}
              className={cn(
                'p-3 rounded-lg border-2 text-left transition-all',
                formData.diagnosticLevel === level.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="font-medium text-sm">{level.label}</div>
              <div className="text-xs text-muted-foreground">{level.time}</div>
              <div className="text-xs text-muted-foreground mt-1">{level.description}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Previous Assessment Info */}
      {previousAssessment && (
        <Card className="glass p-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Předchozí diagnostika: {new Date(previousAssessment.created_at).toLocaleDateString('cs-CZ')}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Změny oproti předchozí diagnostice jsou označeny ikonami.
          </p>
        </Card>
      )}

      {/* Tabs */}
      {activeTab && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </TabsList>

          {/* Client Tab */}
          <TabsContent value="client" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Identifikace klienta</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Vyhledat existujícího klienta</Label>
                  <Input
                    placeholder="Jméno nebo email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="mt-1"
                  />
                  {clientSearch && filteredClients.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
                      {filteredClients.slice(0, 5).map(client => (
                        <button
                          key={client.id}
                          onClick={() => {
                            handleClientSelect(client.id);
                            setClientSearch('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors flex items-center justify-between"
                        >
                          <span>{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formData.clientId && !isNewClient && (
                  <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="font-medium">{formData.clientName}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={isNewClient} 
                    onCheckedChange={(checked) => {
                      setIsNewClient(checked);
                      if (checked) updateField('clientId', undefined);
                    }} 
                  />
                  <Label>Vytvořit nového klienta</Label>
                </div>

                {isNewClient && (
                  <div className="space-y-3 p-3 rounded-lg bg-secondary/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Jméno *</Label>
                        <Input
                          value={formData.clientName || ''}
                          onChange={(e) => updateField('clientName', e.target.value)}
                          placeholder="Jan Novák"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.clientEmail || ''}
                          onChange={(e) => updateField('clientEmail', e.target.value)}
                          placeholder="jan@email.cz"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Datum narození</Label>
                        <Input
                          type="date"
                          value={formData.clientBirthDate || ''}
                          onChange={(e) => updateField('clientBirthDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Pohlaví</Label>
                        <Select value={formData.clientGender} onValueChange={(v) => updateField('clientGender', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Muž</SelectItem>
                            <SelectItem value="female">Žena</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dominantní ruka</Label>
                    <RadioGroup 
                      value={formData.handedness} 
                      onValueChange={(v) => updateField('handedness', v)}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="right" id="right" />
                        <Label htmlFor="right" className="cursor-pointer">Pravák</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="left" id="left" />
                        <Label htmlFor="left" className="cursor-pointer">Levák</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Povolání</Label>
                    <Input
                      value={formData.occupation}
                      onChange={(e) => updateField('occupation', e.target.value)}
                      placeholder="Programátor, Učitel..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Hodiny sezení denně: {formData.sittingHoursDaily}h</Label>
                  <Slider
                    value={[formData.sittingHoursDaily]}
                    onValueChange={([v]) => updateField('sittingHoursDaily', v)}
                    max={16}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Lifestyle Tab */}
          <TabsContent value="lifestyle" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Životní styl</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Sportovní historie</Label>
                  <Textarea
                    value={formData.sportsHistory}
                    onChange={(e) => updateField('sportsHistory', e.target.value)}
                    placeholder="Jaké sporty jste dělal/a v minulosti?"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Současné aktivity</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={tempInput.currentActivities || ''}
                      onChange={(e) => setTempInput(p => ({ ...p, currentActivities: e.target.value }))}
                      placeholder="Přidat aktivitu..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('currentActivities', tempInput.currentActivities || ''))}
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="secondary"
                      onClick={() => addToArray('currentActivities', tempInput.currentActivities || '')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.currentActivities.map((a, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {a}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('currentActivities', i)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Spánek: {formData.sleepHours}h</Label>
                    <Slider
                      value={[formData.sleepHours]}
                      onValueChange={([v]) => updateField('sleepHours', v)}
                      min={4}
                      max={12}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Kvalita spánku: {formData.sleepQuality}/5</Label>
                    <Slider
                      value={[formData.sleepQuality]}
                      onValueChange={([v]) => updateField('sleepQuality', v)}
                      min={1}
                      max={5}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Úroveň stresu: {formData.stressLevel}/5</Label>
                  <Slider
                    value={[formData.stressLevel]}
                    onValueChange={([v]) => updateField('stressLevel', v)}
                    min={1}
                    max={5}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Regenerační metody</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {REGENERATION_METHODS.map(method => (
                      <Badge
                        key={method}
                        variant={formData.regenerationMethods.includes(method) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleArrayItem('regenerationMethods', method)}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.meditates} 
                    onCheckedChange={(v) => updateField('meditates', v)} 
                  />
                  <Label>Pravidelná meditace</Label>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Zdravotní stav</h3>
              
              <div className="space-y-4">
                {(['diseases', 'surgeries', 'injuries', 'painAreas', 'allergies'] as const).map(field => (
                  <div key={field}>
                    <Label>
                      {field === 'diseases' && 'Nemoci'}
                      {field === 'surgeries' && 'Operace'}
                      {field === 'injuries' && 'Úrazy'}
                      {field === 'painAreas' && 'Bolesti'}
                      {field === 'allergies' && 'Alergie'}
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={tempInput[field] || ''}
                        onChange={(e) => setTempInput(p => ({ ...p, [field]: e.target.value }))}
                        placeholder="Přidat..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray(field, tempInput[field] || ''))}
                      />
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="secondary"
                        onClick={() => addToArray(field, tempInput[field] || '')}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData[field].map((item, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {item}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray(field, i)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <Label>Rodinná anamnéza</Label>
                  <Textarea
                    value={formData.familyHealthHistory}
                    onChange={(e) => updateField('familyHealthHistory', e.target.value)}
                    placeholder="Zdravotní problémy v rodině..."
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Cíle</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Krátkodobé cíle (1-3 měsíce)</Label>
                  <Textarea
                    value={formData.shortTermGoals}
                    onChange={(e) => updateField('shortTermGoals', e.target.value)}
                    placeholder="Co chcete dosáhnout v nejbližší době?"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Dlouhodobé cíle (6-12 měsíců)</Label>
                  <Textarea
                    value={formData.longTermGoals}
                    onChange={(e) => updateField('longTermGoals', e.target.value)}
                    placeholder="Jaké jsou vaše dlouhodobé cíle?"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Tréninkové priority</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={tempInput.trainingPriorities || ''}
                      onChange={(e) => setTempInput(p => ({ ...p, trainingPriorities: e.target.value }))}
                      placeholder="Přidat prioritu..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('trainingPriorities', tempInput.trainingPriorities || ''))}
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="secondary"
                      onClick={() => addToArray('trainingPriorities', tempInput.trainingPriorities || '')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.trainingPriorities.map((p, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {p}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('trainingPriorities', i)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Mobility Tab - Enhanced */}
          <TabsContent value="mobility" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Mobilita & Technika</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Mobilita kloubů</h4>
                  <div className="space-y-3">
                    {MOBILITY_AREAS.map(({ field, label, dbField }) => {
                      const valueField = field as keyof ExtendedDiagnosticData;
                      const sideField = `${field}Side` as keyof ExtendedDiagnosticData;
                      const noteField = `${field}Note` as keyof ExtendedDiagnosticData;
                      const prevValue = getPreviousValue(dbField);
                      
                      return (
                        <div key={field} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-medium">
                              {label}
                              {prevValue && <TrendIndicator current={formData[valueField] as string} previous={prevValue} field={field} />}
                            </span>
                            <div className="flex gap-1">
                              {MOBILITY_OPTIONS.map(opt => (
                                <Badge
                                  key={opt.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[valueField] === opt.value ? opt.color : ''
                                  )}
                                  onClick={() => updateField(valueField, opt.value)}
                                >
                                  {opt.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {SIDE_OPTIONS.map(side => (
                                <Badge
                                  key={side.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[sideField] === side.value ? 'bg-primary/20 border-primary' : ''
                                  )}
                                  onClick={() => updateField(sideField, formData[sideField] === side.value ? '' : side.value)}
                                >
                                  {side.label}
                                </Badge>
                              ))}
                            </div>
                            <Input
                              placeholder="Poznámka..."
                              value={(formData[noteField] as string) || ''}
                              onChange={(e) => updateField(noteField, e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                          {prevValue && prevValue !== formData[valueField] && (
                            <div className="text-xs text-muted-foreground">
                              Předchozí: {MOBILITY_OPTIONS.find(o => o.value === prevValue)?.label || prevValue}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Kvalita pohybů</h4>
                  <div className="space-y-3">
                    {MOVEMENT_QUALITY_AREAS.map(({ field, label, dbField }) => {
                      const valueField = field as keyof ExtendedDiagnosticData;
                      const sideField = field.replace('Quality', 'Side') as keyof ExtendedDiagnosticData;
                      const noteField = field.replace('Quality', 'Note') as keyof ExtendedDiagnosticData;
                      const prevValue = getPreviousValue(`${dbField}_quality`);
                      
                      return (
                        <div key={field} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-medium">
                              {label}
                              {prevValue && <TrendIndicator current={formData[valueField] as string} previous={prevValue} field={field} />}
                            </span>
                            <div className="flex gap-1">
                              {MOBILITY_OPTIONS.map(opt => (
                                <Badge
                                  key={opt.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[valueField] === opt.value ? opt.color : ''
                                  )}
                                  onClick={() => updateField(valueField, opt.value)}
                                >
                                  {opt.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {SIDE_OPTIONS.map(side => (
                                <Badge
                                  key={side.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[sideField] === side.value ? 'bg-primary/20 border-primary' : ''
                                  )}
                                  onClick={() => updateField(sideField, formData[sideField] === side.value ? '' : side.value)}
                                >
                                  {side.label}
                                </Badge>
                              ))}
                            </div>
                            <Input
                              placeholder="Poznámka..."
                              value={(formData[noteField] as string) || ''}
                              onChange={(e) => updateField(noteField, e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Pain Tab - Enhanced */}
          <TabsContent value="pain" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Screening bolesti</h3>
              
              <div className="space-y-3">
                {PAIN_AREAS.map(({ field, label, dbField }) => {
                  const valueField = field as keyof ExtendedDiagnosticData;
                  const durationField = `${field}Duration` as keyof ExtendedDiagnosticData;
                  const triggerField = `${field}Trigger` as keyof ExtendedDiagnosticData;
                  const sideField = `${field}Side` as keyof ExtendedDiagnosticData;
                  const prevValue = getPreviousValue(dbField);
                  const hasPain = formData[valueField] !== 'none';
                  
                  return (
                    <div key={field} className={cn(
                      "p-3 rounded-lg space-y-2",
                      hasPain ? 'bg-destructive/10' : 'bg-secondary/50'
                    )}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-medium">
                          {label}
                          {prevValue && <TrendIndicator current={formData[valueField] as string} previous={prevValue} field={field} />}
                        </span>
                        <div className="flex gap-1">
                          {PAIN_OPTIONS.map(opt => (
                            <Badge
                              key={opt.value}
                              variant="outline"
                              className={cn(
                                'cursor-pointer text-xs',
                                formData[valueField] === opt.value ? opt.color : ''
                              )}
                              onClick={() => updateField(valueField, opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {hasPain && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {/* Side */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Strana:</span>
                            <div className="flex gap-1">
                              {SIDE_OPTIONS.map(side => (
                                <Badge
                                  key={side.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[sideField] === side.value ? 'bg-primary/20 border-primary' : ''
                                  )}
                                  onClick={() => updateField(sideField, formData[sideField] === side.value ? '' : side.value)}
                                >
                                  {side.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Od kdy:</span>
                            <div className="flex gap-1 flex-wrap">
                              {PAIN_DURATION_OPTIONS.map(dur => (
                                <Badge
                                  key={dur.value}
                                  variant="outline"
                                  className={cn(
                                    'cursor-pointer text-xs',
                                    formData[durationField] === dur.value ? 'bg-warning/20 border-warning' : ''
                                  )}
                                  onClick={() => updateField(durationField, formData[durationField] === dur.value ? '' : dur.value)}
                                >
                                  {dur.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Triggers */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16">Při čem:</span>
                            <div className="flex gap-1">
                              {PAIN_TRIGGER_OPTIONS.map(trigger => {
                                const triggers = (formData[triggerField] as string[]) || [];
                                const isSelected = triggers.includes(trigger.value);
                                return (
                                  <Badge
                                    key={trigger.value}
                                    variant="outline"
                                    className={cn(
                                      'cursor-pointer text-xs',
                                      isSelected ? 'bg-destructive/20 border-destructive' : ''
                                    )}
                                    onClick={() => {
                                      if (isSelected) {
                                        updateField(triggerField, triggers.filter(t => t !== trigger.value));
                                      } else {
                                        updateField(triggerField, [...triggers, trigger.value]);
                                      }
                                    }}
                                  >
                                    {trigger.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {prevValue && prevValue !== formData[valueField] && (
                        <div className="text-xs text-muted-foreground">
                          Předchozí: {PAIN_OPTIONS.find(o => o.value === prevValue)?.label || prevValue}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Psychology Tab - Simplified */}
          <TabsContent value="psychology" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Psychologický profil</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Preferovaný styl tréninku</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {TRAINING_STYLES.map(style => (
                      <Badge
                        key={style}
                        variant={formData.preferredTrainingStyle === style ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => updateField('preferredTrainingStyle', style)}
                      >
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Co vám v tréninku nejčastěji brání?</Label>
                  <Textarea
                    value={formData.trainingBarrier}
                    onChange={(e) => updateField('trainingBarrier', e.target.value)}
                    placeholder="Nedostatek času, motivace, energie, bolest..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Nutrition Tab - Simplified */}
          <TabsContent value="nutrition" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Stravování</h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Pravidelnost stravování</Label>
                  <Select value={formData.eatingRegularity} onValueChange={(v) => updateField('eatingRegularity', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Vyberte" />
                    </SelectTrigger>
                    <SelectContent>
                      {EATING_REGULARITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Omezení a alergie</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={tempInput.allRestrictions || ''}
                      onChange={(e) => setTempInput(p => ({ ...p, allRestrictions: e.target.value }))}
                      placeholder="Přidat omezení (alergie, intolerance, dieta)..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('allRestrictions', tempInput.allRestrictions || ''))}
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="secondary"
                      onClick={() => addToArray('allRestrictions', tempInput.allRestrictions || '')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.allRestrictions.map((item, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {item}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('allRestrictions', i)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Suplementy</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={tempInput.supplements || ''}
                      onChange={(e) => setTempInput(p => ({ ...p, supplements: e.target.value }))}
                      placeholder="Přidat suplement..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('supplements', tempInput.supplements || ''))}
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="secondary"
                      onClick={() => addToArray('supplements', tempInput.supplements || '')}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.supplements.map((item, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {item}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('supplements', i)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Foto & Video</h3>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Přední pohled', key: 'front' },
                  { label: 'Boční pohled', key: 'side' },
                  { label: 'Zadní pohled', key: 'back' }
                ].map(({ label, key }) => {
                  const existingPhoto = mediaFiles.find(m => m.viewType === key);
                  const inputId = `photo-${key}`;
                  
                  return (
                    <div key={key} className="relative">
                      <input
                        type="file"
                        id={inputId}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, key)}
                      />
                      {existingPhoto ? (
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                          <img 
                            src={existingPhoto.preview} 
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => document.getElementById(inputId)?.click()}
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => removeMediaFile(existingPhoto.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                            {label}
                          </span>
                        </div>
                      ) : (
                        <label 
                          htmlFor={inputId}
                          className="aspect-[3/4] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <Camera className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground text-center">{label}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>

              {mediaFiles.filter(m => !m.viewType).length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Další fotografie</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaFiles.filter(m => !m.viewType).map((media) => (
                      <div key={media.id} className="relative aspect-square group">
                        <img
                          src={media.preview}
                          alt="Foto"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMediaFile(media.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <input
                  type="file"
                  id="photo-additional"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-additional')?.click()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat další fotku
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Conclusion Tab - Structured Trainer Notes */}
          <TabsContent value="conclusion" className="space-y-4">
            <Card className="glass p-4">
              <h3 className="font-medium mb-4">Závěr trenéra</h3>
              
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <Label className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    🔴 RIZIKA
                  </Label>
                  <Textarea
                    value={formData.trainerRisks}
                    onChange={(e) => updateField('trainerRisks', e.target.value)}
                    placeholder="Co sledovat, na co dávat pozor..."
                    className="mt-2 min-h-[80px] bg-background"
                  />
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Label className="flex items-center gap-2 text-primary">
                    <Target className="w-4 h-4" />
                    🎯 PRIORITY
                  </Label>
                  <Textarea
                    value={formData.trainerPriorities}
                    onChange={(e) => updateField('trainerPriorities', e.target.value)}
                    placeholder="Na čem pracovat, hlavní zaměření..."
                    className="mt-2 min-h-[80px] bg-background"
                  />
                </div>

                <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <Label className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    ⚠️ OMEZENÍ
                  </Label>
                  <Textarea
                    value={formData.trainerLimitations}
                    onChange={(e) => updateField('trainerLimitations', e.target.value)}
                    placeholder="Kontraindikace, cviky které nedělat..."
                    className="mt-2 min-h-[80px] bg-background"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    📝 DALŠÍ POZNÁMKY
                  </Label>
                  <Textarea
                    value={formData.trainerOtherNotes}
                    onChange={(e) => updateField('trainerOtherNotes', e.target.value)}
                    placeholder="Další důležité informace..."
                    className="mt-2 min-h-[80px]"
                  />
                </div>
              </div>
            </Card>

            {/* AI Section - Collapsible */}
            <Collapsible open={showAISection} onOpenChange={setShowAISection}>
              <Card className="glass p-4">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI asistent (volitelné)
                    </h3>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showAISection && "rotate-180")} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={handleGenerateSummary}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Nechat AI doplnit doporučení
                  </Button>

                  {finalSummary && (
                    <div className="mt-4 space-y-3 text-sm">
                      {finalSummary.riskFactors && finalSummary.riskFactors.length > 0 && (
                        <div>
                          <h4 className="font-medium text-destructive mb-1">AI Rizikové faktory</h4>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {finalSummary.riskFactors.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      {finalSummary.strengths && finalSummary.strengths.length > 0 && (
                        <div>
                          <h4 className="font-medium text-success mb-1">AI Silné stránky</h4>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {finalSummary.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {finalSummary.trainingPriorities && finalSummary.trainingPriorities.length > 0 && (
                        <div>
                          <h4 className="font-medium text-primary mb-1">AI Priority</h4>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            {finalSummary.trainingPriorities.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {finalSummary.mustDoExercises && finalSummary.mustDoExercises.length > 0 && (
                          <div>
                            <h4 className="font-medium text-success mb-1 text-xs">Must-do cviky</h4>
                            <div className="flex flex-wrap gap-1">
                              {finalSummary.mustDoExercises.map((e, i) => (
                                <Badge key={i} variant="outline" className="bg-success/10 text-xs">{e}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {finalSummary.avoidExercises && finalSummary.avoidExercises.length > 0 && (
                          <div>
                            <h4 className="font-medium text-destructive mb-1 text-xs">Vyhnout se</h4>
                            <div className="flex flex-wrap gap-1">
                              {finalSummary.avoidExercises.map((e, i) => (
                                <Badge key={i} variant="outline" className="bg-destructive/10 text-xs">{e}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>
        </Tabs>
      )}

      {/* Navigation & Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {activeTab && availableTabs.indexOf(activeTab) > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIndex = availableTabs.indexOf(activeTab);
                if (currentIndex > 0) {
                  setActiveTab(availableTabs[currentIndex - 1]);
                }
              }}
            >
              Zpět
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {activeTab && availableTabs.indexOf(activeTab) < availableTabs.length - 1 ? (
            <Button
              type="button"
              onClick={() => {
                const currentIndex = availableTabs.indexOf(activeTab);
                if (currentIndex < availableTabs.length - 1) {
                  setActiveTab(availableTabs[currentIndex + 1]);
                }
              }}
            >
              Další
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Uložit diagnostiku
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
