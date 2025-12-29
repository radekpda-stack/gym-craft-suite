import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Save,
  Loader2,
  User,
  Briefcase,
  Activity,
  Heart,
  Target,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  usePreDiagnosticAnswers, 
  useUpdateTrainerSummary,
  useApproveSummary,
  PreDiagnosticForm 
} from '@/hooks/usePreDiagnosticForms';
import { toast } from 'sonner';

interface TrainerDiagnosticFormProps {
  form: PreDiagnosticForm;
  clientName: string;
  onClose?: () => void;
}

const PAIN_AREAS = [
  'krk', 'ramena', 'horní záda', 'bederní páteř', 
  'kyčle', 'kolena', 'kotníky', 'zápěstí'
];

const JOINT_STATUS_OPTIONS = [
  { value: 'ok', label: 'OK', color: 'bg-success/20 text-success' },
  { value: 'limited', label: 'Omezená', color: 'bg-warning/20 text-warning' },
  { value: 'painful', label: 'Bolestivá', color: 'bg-destructive/20 text-destructive' },
];

interface TrainerData {
  // Intake values (editable)
  birth_year?: number;
  gender?: string;
  work_type?: string;
  sitting_hours?: number;
  movement_frequency?: string;
  sleep_hours?: number;
  sleep_quality?: number;
  diet_quality?: string;
  has_pain?: boolean;
  pain_areas?: string[];
  pain_note?: string;
  health_notes?: string;
  main_goal?: string;
  
  // Trainer-only fields
  trainer_notes?: string;
  main_limiters?: string[];
  limiter_note?: string;
  training_alert?: string;
  next_steps?: string;
  
  // Joint assessments
  ankle_status?: string;
  hip_status?: string;
  shoulder_status?: string;
}

export function TrainerDiagnosticForm({
  form,
  clientName,
  onClose,
}: TrainerDiagnosticFormProps) {
  const { data: answers = [], isLoading: isLoadingAnswers } = usePreDiagnosticAnswers(form.id);
  const updateSummary = useUpdateTrainerSummary();
  const approveSummary = useApproveSummary();
  
  const [data, setData] = useState<TrainerData>({});
  const [intakeOpen, setIntakeOpen] = useState(true);
  const [trainerOpen, setTrainerOpen] = useState(true);
  const [jointsOpen, setJointsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load answers into form
  useEffect(() => {
    if (answers.length > 0) {
      const loaded: TrainerData = {};
      answers.forEach(a => {
        (loaded as any)[a.field_key] = a.value;
      });
      
      // Also load trainer summary fields
      loaded.trainer_notes = form.trainer_summary || '';
      loaded.next_steps = form.trainer_recommendations || '';
      loaded.training_alert = form.trainer_restrictions || '';
      
      setData(loaded);
    }
  }, [answers, form]);

  const updateField = <K extends keyof TrainerData>(field: K, value: TrainerData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const togglePainArea = (area: string) => {
    setData(prev => {
      const arr = prev.pain_areas || [];
      if (arr.includes(area)) {
        return { ...prev, pain_areas: arr.filter(a => a !== area) };
      }
      return { ...prev, pain_areas: [...arr, area] };
    });
    setHasChanges(true);
  };

  const toggleLimiter = (limiter: string) => {
    setData(prev => {
      const arr = prev.main_limiters || [];
      if (arr.includes(limiter)) {
        return { ...prev, main_limiters: arr.filter(l => l !== limiter) };
      }
      return { ...prev, main_limiters: [...arr, limiter] };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSummary.mutateAsync({
        formId: form.id,
        summary: data.trainer_notes,
        recommendations: data.next_steps,
        restrictions: data.training_alert,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleApprove = async () => {
    if (hasChanges) {
      await handleSave();
    }
    await approveSummary.mutateAsync(form.id);
  };

  if (isLoadingAnswers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isApproved = form.summary_approved;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Trenérská diagnostika
          </h3>
          <p className="text-sm text-muted-foreground">
            {clientName} • {format(new Date(form.created_at), 'd. MMM yyyy', { locale: cs })}
          </p>
        </div>
        {isApproved && (
          <Badge variant="default" className="bg-success/20 text-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Schváleno
          </Badge>
        )}
      </div>

      {/* Intake Data Section */}
      <Collapsible open={intakeOpen} onOpenChange={setIntakeOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
          <span className="font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Data z intake formuláře
          </span>
          {intakeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Birth year */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rok narození</Label>
              <Input
                type="number"
                value={data.birth_year || ''}
                onChange={(e) => updateField('birth_year', parseInt(e.target.value) || undefined)}
                disabled={isApproved}
                className="h-9"
              />
            </div>
            
            {/* Gender */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pohlaví</Label>
              <RadioGroup
                value={data.gender || ''}
                onValueChange={(v) => updateField('gender', v)}
                disabled={isApproved}
                className="flex gap-2"
              >
                <div className={cn("flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm", data.gender === 'male' ? 'bg-primary/20' : 'bg-secondary/50')}>
                  <RadioGroupItem value="male" id="t-male" />
                  <Label htmlFor="t-male" className="cursor-pointer text-xs">Muž</Label>
                </div>
                <div className={cn("flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm", data.gender === 'female' ? 'bg-primary/20' : 'bg-secondary/50')}>
                  <RadioGroupItem value="female" id="t-female" />
                  <Label htmlFor="t-female" className="cursor-pointer text-xs">Žena</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Work type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Práce
              </Label>
              <RadioGroup
                value={data.work_type || ''}
                onValueChange={(v) => updateField('work_type', v)}
                disabled={isApproved}
                className="grid grid-cols-2 gap-1"
              >
                {['sedentary', 'combined', 'active', 'physical'].map((type) => (
                  <div 
                    key={type}
                    className={cn(
                      "flex items-center justify-center px-2 py-1 rounded text-xs cursor-pointer",
                      data.work_type === type ? 'bg-primary/20 border border-primary' : 'bg-secondary/50'
                    )}
                  >
                    <RadioGroupItem value={type} id={`t-${type}`} className="sr-only" />
                    <Label htmlFor={`t-${type}`} className="cursor-pointer text-xs">
                      {type === 'sedentary' && 'Sedavá'}
                      {type === 'combined' && 'Kombi'}
                      {type === 'active' && 'Aktivní'}
                      {type === 'physical' && 'Fyzická'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Movement */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> Pohyb týdně
              </Label>
              <RadioGroup
                value={data.movement_frequency || ''}
                onValueChange={(v) => updateField('movement_frequency', v)}
                disabled={isApproved}
                className="grid grid-cols-4 gap-1"
              >
                {['none', '1-2', '3-4', '5+'].map((freq) => (
                  <div 
                    key={freq}
                    className={cn(
                      "flex items-center justify-center px-2 py-1 rounded text-xs cursor-pointer",
                      data.movement_frequency === freq ? 'bg-primary/20 border border-primary' : 'bg-secondary/50'
                    )}
                  >
                    <RadioGroupItem value={freq} id={`t-freq-${freq}`} className="sr-only" />
                    <Label htmlFor={`t-freq-${freq}`} className="cursor-pointer text-xs">
                      {freq === 'none' ? '0×' : freq}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sitting hours */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sezení denně: {data.sitting_hours ?? 6}h</Label>
              <Slider
                value={[data.sitting_hours ?? 6]}
                onValueChange={([v]) => updateField('sitting_hours', v)}
                max={12}
                min={0}
                step={1}
                disabled={isApproved}
              />
            </div>
            
            {/* Sleep */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Spánek (h)</Label>
              <Input
                type="number"
                value={data.sleep_hours || ''}
                onChange={(e) => updateField('sleep_hours', parseFloat(e.target.value) || undefined)}
                disabled={isApproved}
                className="h-9"
                step={0.5}
              />
            </div>
          </div>

          {/* Pain */}
          {data.has_pain && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1 text-destructive">
                <Heart className="w-3 h-3" /> Aktuální bolest
              </Label>
              <div className="flex flex-wrap gap-1">
                {PAIN_AREAS.map((area) => (
                  <Badge
                    key={area}
                    variant={(data.pain_areas || []).includes(area) ? 'destructive' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => !isApproved && togglePainArea(area)}
                  >
                    {area}
                  </Badge>
                ))}
              </div>
              {data.pain_note && (
                <p className="text-xs text-muted-foreground">{data.pain_note}</p>
              )}
            </div>
          )}

          {/* Health notes */}
          {data.health_notes && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Zdravotní poznámky (klient)</Label>
              <p className="text-sm p-2 bg-secondary/30 rounded">{data.health_notes}</p>
            </div>
          )}

          {/* Goal */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" /> Cíl klienta
            </Label>
            <Input
              value={data.main_goal || ''}
              onChange={(e) => updateField('main_goal', e.target.value)}
              disabled={isApproved}
              className="h-9"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Trainer Notes Section */}
      <Collapsible open={trainerOpen} onOpenChange={setTrainerOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
          <span className="font-medium flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Trenérské závěry
          </span>
          {trainerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Trainer notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Poznámky / závěry</Label>
            <Textarea
              value={data.trainer_notes || ''}
              onChange={(e) => updateField('trainer_notes', e.target.value)}
              placeholder="Celkové zhodnocení klienta, pozorování..."
              rows={3}
              disabled={isApproved}
            />
          </div>

          {/* Main limiters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hlavní limitery</Label>
            <div className="flex flex-wrap gap-1">
              {['mobilita', 'stabilita', 'síla', 'vytrvalost', 'koordinace', 'bolest', 'motivace', 'čas'].map((limiter) => (
                <Badge
                  key={limiter}
                  variant={(data.main_limiters || []).includes(limiter) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => !isApproved && toggleLimiter(limiter)}
                >
                  {limiter}
                </Badge>
              ))}
            </div>
            <Input
              value={data.limiter_note || ''}
              onChange={(e) => updateField('limiter_note', e.target.value)}
              placeholder="Poznámka k limiterům..."
              disabled={isApproved}
              className="h-9"
            />
          </div>

          {/* Training alert */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Klíčové upozornění pro trénink
            </Label>
            <Textarea
              value={data.training_alert || ''}
              onChange={(e) => updateField('training_alert', e.target.value)}
              placeholder="Zobrazí se v tréninku jako varování..."
              rows={2}
              disabled={isApproved}
              className="border-warning/50 focus:border-warning"
            />
          </div>

          {/* Next steps */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Doporučení / next steps</Label>
            <Textarea
              value={data.next_steps || ''}
              onChange={(e) => updateField('next_steps', e.target.value)}
              placeholder="Na co se zaměřit, co řešit prioritně..."
              rows={2}
              disabled={isApproved}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Joint Assessment Section */}
      <Collapsible open={jointsOpen} onOpenChange={setJointsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors">
          <span className="font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Základní klouby (volitelné)
          </span>
          {jointsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'ankle_status', label: 'Kotník' },
              { key: 'hip_status', label: 'Kyčel' },
              { key: 'shoulder_status', label: 'Rameno' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label className="text-xs text-center block">{label}</Label>
                <div className="flex flex-col gap-1">
                  {JOINT_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !isApproved && updateField(key as keyof TrainerData, opt.value)}
                      className={cn(
                        "px-2 py-1 rounded text-xs transition-colors",
                        (data as any)[key] === opt.value ? opt.color : 'bg-secondary/30 hover:bg-secondary/50'
                      )}
                      disabled={isApproved}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      {!isApproved && (
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!hasChanges || updateSummary.isPending}
            className="gap-2"
          >
            {updateSummary.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Uložit
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveSummary.isPending}
            className="gap-2 flex-1"
          >
            {approveSummary.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Schválit diagnostiku
          </Button>
        </div>
      )}
    </div>
  );
}
