import { useState, useCallback } from 'react';
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
import { 
  User, Heart, Target, Activity, Brain, Apple, 
  Camera, Sparkles, AlertTriangle, CheckCircle, Loader2,
  Plus, X, ChevronRight, Save, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useDiagnosticAI, FormHintsResult, FinalSummaryResult } from '@/hooks/useDiagnosticAI';

interface ExtendedDiagnosticFormProps {
  clients: Client[];
  defaultClientId?: string;
  onSubmit: (data: ExtendedDiagnosticData) => Promise<void>;
  onClientCreate?: (clientData: Partial<Client>) => Promise<string>;
  isLoading?: boolean;
}

export interface ExtendedDiagnosticData {
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
  
  // Mobility Assessment
  mobilityAnkles: string;
  mobilityHips: string;
  mobilityThoracic: string;
  mobilityShoulders: string;
  coreStability: string;
  
  // Movement Quality
  squatQuality: string;
  lungeQuality: string;
  pushQuality: string;
  pullQuality: string;
  hipHingeQuality: string;
  
  // Pain Screening
  painAnkle: string;
  painKnee: string;
  painHip: string;
  painSi: string;
  painLumbar: string;
  painThoracic: string;
  painShoulder: string;
  painNeck: string;
  
  // Psychological
  motivationLevel: number;
  disciplineLevel: number;
  preferredTrainingStyle: string;
  stressManagement: string;
  
  // Nutrition
  eatingRegularity: string;
  foodAllergies: string[];
  supplements: string[];
  dietaryRestrictions: string[];
  
  // Trainer Notes
  trainerNotes: string;
  
  // AI Results
  aiAnalysis?: FinalSummaryResult;
  
  // Media
  mediaUrls?: string[];
}

const MOBILITY_OPTIONS = [
  { value: 'ok', label: 'OK', color: 'bg-success/20 text-success' },
  { value: 'limited', label: 'Omezená', color: 'bg-warning/20 text-warning' },
  { value: 'painful', label: 'Bolestivá', color: 'bg-destructive/20 text-destructive' },
];

const PAIN_OPTIONS = [
  { value: 'none', label: 'Bez bolesti', color: 'bg-success/20 text-success' },
  { value: 'mild', label: 'Mírná', color: 'bg-warning/20 text-warning' },
  { value: 'significant', label: 'Významná', color: 'bg-destructive/20 text-destructive' },
];

const TRAINING_STYLES = [
  'Silový trénink', 'HIIT', 'Kardio', 'Mobilita', 'Funkční trénink', 
  'Bodybuilding', 'Crossfit', 'Jóga', 'Bojové sporty', 'Jiné'
];

const REGENERATION_METHODS = [
  'Spánek', 'Sauna', 'Masáže', 'Strečink', 'Foam rolling', 
  'Studená sprcha', 'Meditace', 'Procházky'
];

const defaultFormData: ExtendedDiagnosticData = {
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
  mobilityAnkles: 'ok',
  mobilityHips: 'ok',
  mobilityThoracic: 'ok',
  mobilityShoulders: 'ok',
  coreStability: 'ok',
  squatQuality: 'ok',
  lungeQuality: 'ok',
  pushQuality: 'ok',
  pullQuality: 'ok',
  hipHingeQuality: 'ok',
  painAnkle: 'none',
  painKnee: 'none',
  painHip: 'none',
  painSi: 'none',
  painLumbar: 'none',
  painThoracic: 'none',
  painShoulder: 'none',
  painNeck: 'none',
  motivationLevel: 3,
  disciplineLevel: 3,
  preferredTrainingStyle: '',
  stressManagement: '',
  eatingRegularity: '',
  foodAllergies: [],
  supplements: [],
  dietaryRestrictions: [],
  trainerNotes: '',
};

export function ExtendedDiagnosticForm({
  clients,
  defaultClientId,
  onSubmit,
  onClientCreate,
  isLoading,
}: ExtendedDiagnosticFormProps) {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState<ExtendedDiagnosticData>({
    ...defaultFormData,
    clientId: defaultClientId,
  });
  const [clientSearch, setClientSearch] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [tempInput, setTempInput] = useState<Record<string, string>>({});

  const { 
    isAnalyzing, 
    formHints, 
    finalSummary,
    analyzeFormData, 
    generateFinalSummary 
  } = useDiagnosticAI();

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

  const handleRunAIAnalysis = async () => {
    await analyzeFormData({
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
      motivationLevel: formData.motivationLevel,
      disciplineLevel: formData.disciplineLevel,
      preferredTrainingStyle: formData.preferredTrainingStyle,
      eatingRegularity: formData.eatingRegularity,
      supplements: formData.supplements,
      dietaryRestrictions: formData.dietaryRestrictions,
      trainerNotes: formData.trainerNotes,
    });
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
      motivationLevel: formData.motivationLevel,
      disciplineLevel: formData.disciplineLevel,
      preferredTrainingStyle: formData.preferredTrainingStyle,
      eatingRegularity: formData.eatingRegularity,
      supplements: formData.supplements,
      dietaryRestrictions: formData.dietaryRestrictions,
      trainerNotes: formData.trainerNotes,
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

  const tabs = [
    { id: 'client', label: 'Klient', icon: User },
    { id: 'lifestyle', label: 'Životní styl', icon: Activity },
    { id: 'health', label: 'Zdraví', icon: Heart },
    { id: 'goals', label: 'Cíle', icon: Target },
    { id: 'mobility', label: 'Mobilita', icon: Activity },
    { id: 'pain', label: 'Bolest', icon: AlertTriangle },
    { id: 'psychology', label: 'Psychika', icon: Brain },
    { id: 'nutrition', label: 'Strava', icon: Apple },
    { id: 'media', label: 'Foto/Video', icon: Camera },
    { id: 'summary', label: 'AI Shrnutí', icon: Sparkles },
  ];

  return (
    <div className="space-y-4">
      {/* AI Hints Panel */}
      {formHints && (
        <Card className="glass p-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">AI Doporučení</span>
          </div>
          <div className="space-y-2 text-sm">
            {formHints.warnings?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formHints.warnings.map((w, i) => (
                  <Badge key={i} variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    {w}
                  </Badge>
                ))}
              </div>
            )}
            {formHints.riskFactors?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formHints.riskFactors.map((r, i) => (
                  <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
            {formHints.notes && (
              <p className="text-muted-foreground">{formHints.notes}</p>
            )}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
          {tabs.map(tab => (
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Diagnostika bude přiřazena k existujícímu klientovi
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch 
                  checked={isNewClient} 
                  onCheckedChange={(checked) => {
                    setIsNewClient(checked);
                    if (checked) {
                      updateField('clientId', undefined);
                    }
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
                      onClick={() => {
                        if (formData.regenerationMethods.includes(method)) {
                          updateField('regenerationMethods', formData.regenerationMethods.filter(m => m !== method));
                        } else {
                          updateField('regenerationMethods', [...formData.regenerationMethods, method]);
                        }
                      }}
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

        {/* Mobility Tab */}
        <TabsContent value="mobility" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Mobilita & Technika</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Mobilita kloubů</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { field: 'mobilityAnkles' as const, label: 'Kotníky' },
                    { field: 'mobilityHips' as const, label: 'Kyčle' },
                    { field: 'mobilityThoracic' as const, label: 'Hrudní páteř' },
                    { field: 'mobilityShoulders' as const, label: 'Ramena' },
                    { field: 'coreStability' as const, label: 'Stabilita středu' },
                  ].map(({ field, label }) => (
                    <div key={field} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <span className="text-sm">{label}</span>
                      <div className="flex gap-1">
                        {MOBILITY_OPTIONS.map(opt => (
                          <Badge
                            key={opt.value}
                            variant="outline"
                            className={cn(
                              'cursor-pointer text-xs',
                              formData[field] === opt.value ? opt.color : ''
                            )}
                            onClick={() => updateField(field, opt.value)}
                          >
                            {opt.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Kvalita pohybů</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { field: 'squatQuality' as const, label: 'Dřep' },
                    { field: 'lungeQuality' as const, label: 'Výpad' },
                    { field: 'pushQuality' as const, label: 'Tlak' },
                    { field: 'pullQuality' as const, label: 'Tah' },
                    { field: 'hipHingeQuality' as const, label: 'Hip hinge' },
                  ].map(({ field, label }) => (
                    <div key={field} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <span className="text-sm">{label}</span>
                      <div className="flex gap-1">
                        {MOBILITY_OPTIONS.map(opt => (
                          <Badge
                            key={opt.value}
                            variant="outline"
                            className={cn(
                              'cursor-pointer text-xs',
                              formData[field] === opt.value ? opt.color : ''
                            )}
                            onClick={() => updateField(field, opt.value)}
                          >
                            {opt.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Pain Tab */}
        <TabsContent value="pain" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Screening bolesti</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { field: 'painAnkle' as const, label: 'Kotník' },
                { field: 'painKnee' as const, label: 'Koleno' },
                { field: 'painHip' as const, label: 'Kyčel' },
                { field: 'painSi' as const, label: 'SI kloub' },
                { field: 'painLumbar' as const, label: 'Bedra' },
                { field: 'painThoracic' as const, label: 'Hrudní páteř' },
                { field: 'painShoulder' as const, label: 'Rameno' },
                { field: 'painNeck' as const, label: 'Krk' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <span className="text-sm">{label}</span>
                  <div className="flex gap-1">
                    {PAIN_OPTIONS.map(opt => (
                      <Badge
                        key={opt.value}
                        variant="outline"
                        className={cn(
                          'cursor-pointer text-xs',
                          formData[field] === opt.value ? opt.color : ''
                        )}
                        onClick={() => updateField(field, opt.value)}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Psychology Tab */}
        <TabsContent value="psychology" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Psychický profil</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Motivace: {formData.motivationLevel}/5</Label>
                <Slider
                  value={[formData.motivationLevel]}
                  onValueChange={([v]) => updateField('motivationLevel', v)}
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Disciplína: {formData.disciplineLevel}/5</Label>
                <Slider
                  value={[formData.disciplineLevel]}
                  onValueChange={([v]) => updateField('disciplineLevel', v)}
                  min={1}
                  max={5}
                  step={1}
                  className="mt-2"
                />
              </div>

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
                <Label>Jak zvládáte stres?</Label>
                <Textarea
                  value={formData.stressManagement}
                  onChange={(e) => updateField('stressManagement', e.target.value)}
                  placeholder="Způsoby zvládání stresu..."
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Stravování a doplňky</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Pravidelnost stravování</Label>
                <Select value={formData.eatingRegularity} onValueChange={(v) => updateField('eatingRegularity', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Pravidelné (3-5x denně)</SelectItem>
                    <SelectItem value="irregular">Nepravidelné</SelectItem>
                    <SelectItem value="intermittent">Intermittent fasting</SelectItem>
                    <SelectItem value="frequent">Časté (6+ jídel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(['foodAllergies', 'supplements', 'dietaryRestrictions'] as const).map(field => (
                <div key={field}>
                  <Label>
                    {field === 'foodAllergies' && 'Potravinové alergie'}
                    {field === 'supplements' && 'Suplementy'}
                    {field === 'dietaryRestrictions' && 'Dietní omezení'}
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
            </div>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Foto & Video analýza</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nahrajte fotky postury nebo videa pohybu pro AI analýzu.
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              {['Přední pohled', 'Boční pohled', 'Zadní pohled'].map((label, i) => (
                <div 
                  key={i}
                  className="aspect-[3/4] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI Vision analýza je připravena k použití</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Po nahrání fotek systém automaticky analyzuje posturu a identifikuje asymetrie.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="glass p-4">
            <h3 className="font-medium mb-4">Poznámky trenéra</h3>
            <Textarea
              value={formData.trainerNotes}
              onChange={(e) => updateField('trainerNotes', e.target.value)}
              placeholder="Vlastní poznámky, pozorování, doporučení..."
              className="min-h-[120px]"
            />
          </Card>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={handleRunAIAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Analyzovat data
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={handleGenerateSummary}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generovat shrnutí
            </Button>
          </div>

          {finalSummary && (
            <Card className="glass p-4 border-primary/30">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Diagnostický report
              </h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-destructive mb-2">Rizikové faktory</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {finalSummary.riskFactors?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-success mb-2">Silné stránky</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {finalSummary.strengths?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-primary mb-2">Priority do tréninku</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {finalSummary.trainingPriorities?.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                {finalSummary.mobilityRecommendations && (
                  <div>
                    <h4 className="font-medium mb-1">Doporučení pro mobilitu</h4>
                    <p className="text-muted-foreground">{finalSummary.mobilityRecommendations}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-success mb-2">Must-do cviky</h4>
                    <div className="flex flex-wrap gap-1">
                      {finalSummary.mustDoExercises?.map((e, i) => (
                        <Badge key={i} variant="outline" className="bg-success/10">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-destructive mb-2">Vyhnout se</h4>
                    <div className="flex flex-wrap gap-1">
                      {finalSummary.avoidExercises?.map((e, i) => (
                        <Badge key={i} variant="outline" className="bg-destructive/10">{e}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {finalSummary.overallSummary && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <h4 className="font-medium mb-1">Celkové shrnutí</h4>
                    <p className="text-muted-foreground">{finalSummary.overallSummary}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Navigation & Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {activeTab !== 'client' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(tabs[currentIndex - 1].id);
                }
              }}
            >
              Zpět
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {activeTab !== 'summary' ? (
            <Button
              type="button"
              onClick={() => {
                const currentIndex = tabs.findIndex(t => t.id === activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1].id);
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
