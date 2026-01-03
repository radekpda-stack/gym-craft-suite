import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Moon, Zap, Heart, Coffee, Droplets, Dumbbell, 
  ChevronDown, ChevronUp, Save, BrainCircuit 
} from 'lucide-react';
import { useTestContext, useCreateTestContext } from '@/hooks/useTestContext';
import type { CreateTestContextInput } from '@/types/testExtensions';
import { cn } from '@/lib/utils';

interface TestContextFormProps {
  sessionId: string;
  expanded?: boolean;
  onSave?: () => void;
}

const ratingLabels: Record<number, string> = {
  1: 'Velmi špatné',
  2: 'Špatné',
  3: 'Průměrné',
  4: 'Dobré',
  5: 'Výborné',
};

const readinessLabels: Record<number, string> = {
  1: 'Vyčerpaný',
  2: 'Unavený',
  3: 'Lehce unavený',
  4: 'Neutrální',
  5: 'Lehce svěží',
  6: 'Svěží',
  7: 'Dobře připraven',
  8: 'Velmi dobře připraven',
  9: 'Výborně připraven',
  10: 'Nejlepší forma',
};

export function TestContextForm({ sessionId, expanded = false, onSave }: TestContextFormProps) {
  const [isOpen, setIsOpen] = useState(expanded);
  const { data: existingContext } = useTestContext(sessionId);
  const createContext = useCreateTestContext();
  
  const [context, setContext] = useState<Partial<CreateTestContextInput>>({
    sleep_quality_1_5: existingContext?.sleep_quality_1_5 ?? 3,
    sleep_hours: existingContext?.sleep_hours ?? 7,
    stress_level_1_5: existingContext?.stress_level_1_5 ?? 3,
    motivation_level_1_5: existingContext?.motivation_level_1_5 ?? 3,
    nutrition_quality_1_5: existingContext?.nutrition_quality_1_5 ?? 3,
    hours_since_last_meal: existingContext?.hours_since_last_meal ?? 2,
    caffeine_mg: existingContext?.caffeine_mg ?? 0,
    hydration_level_1_5: existingContext?.hydration_level_1_5 ?? 3,
    days_since_last_training: existingContext?.days_since_last_training ?? 1,
    subjective_readiness_1_10: existingContext?.subjective_readiness_1_10 ?? 5,
    notes: existingContext?.notes ?? '',
  });
  
  const handleSave = async () => {
    await createContext.mutateAsync({
      test_session_id: sessionId,
      ...context,
    });
    onSave?.();
  };
  
  const updateField = <K extends keyof CreateTestContextInput>(field: K, value: CreateTestContextInput[K]) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };
  
  const getRatingBadge = (value: number | null | undefined) => {
    if (!value) return null;
    const label = ratingLabels[value];
    const variant = value >= 4 ? 'default' : value >= 3 ? 'secondary' : 'destructive';
    return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
  };
  
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" />
                Kontext před testem
                {existingContext && <Badge variant="outline" className="text-[10px]">Vyplněno</Badge>}
              </CardTitle>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-2">
            {/* Sleep */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                <Label className="font-medium">Spánek</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Kvalita spánku</Label>
                    {getRatingBadge(context.sleep_quality_1_5)}
                  </div>
                  <Slider
                    value={[context.sleep_quality_1_5 ?? 3]}
                    onValueChange={([v]) => updateField('sleep_quality_1_5', v)}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Délka spánku (h)</Label>
                  <Input
                    type="number"
                    value={context.sleep_hours ?? ''}
                    onChange={e => updateField('sleep_hours', parseFloat(e.target.value) || null)}
                    min={0}
                    max={24}
                    step={0.5}
                  />
                </div>
              </div>
            </div>
            
            {/* Energy & Stress */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <Label className="font-medium">Energie & Stres</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Úroveň stresu</Label>
                    {getRatingBadge(context.stress_level_1_5 ? 6 - context.stress_level_1_5 : undefined)}
                  </div>
                  <Slider
                    value={[context.stress_level_1_5 ?? 3]}
                    onValueChange={([v]) => updateField('stress_level_1_5', v)}
                    min={1}
                    max={5}
                    step={1}
                  />
                  <p className="text-[10px] text-muted-foreground">1 = nízký stres, 5 = vysoký stres</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Motivace</Label>
                    {getRatingBadge(context.motivation_level_1_5)}
                  </div>
                  <Slider
                    value={[context.motivation_level_1_5 ?? 3]}
                    onValueChange={([v]) => updateField('motivation_level_1_5', v)}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
              </div>
            </div>
            
            {/* Nutrition */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <Label className="font-medium">Výživa</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Kvalita</Label>
                    {getRatingBadge(context.nutrition_quality_1_5)}
                  </div>
                  <Slider
                    value={[context.nutrition_quality_1_5 ?? 3]}
                    onValueChange={([v]) => updateField('nutrition_quality_1_5', v)}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hodin od jídla</Label>
                  <Input
                    type="number"
                    value={context.hours_since_last_meal ?? ''}
                    onChange={e => updateField('hours_since_last_meal', parseFloat(e.target.value) || null)}
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Coffee className="w-3 h-3" /> Kofein (mg)
                  </Label>
                  <Input
                    type="number"
                    value={context.caffeine_mg ?? ''}
                    onChange={e => updateField('caffeine_mg', parseInt(e.target.value) || null)}
                    min={0}
                    step={50}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            {/* Hydration & Training */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <Label className="font-medium">Hydratace & Regenerace</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Hydratace</Label>
                    {getRatingBadge(context.hydration_level_1_5)}
                  </div>
                  <Slider
                    value={[context.hydration_level_1_5 ?? 3]}
                    onValueChange={([v]) => updateField('hydration_level_1_5', v)}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" /> Dní od tréninku
                  </Label>
                  <Input
                    type="number"
                    value={context.days_since_last_training ?? ''}
                    onChange={e => updateField('days_since_last_training', parseInt(e.target.value) || null)}
                    min={0}
                  />
                </div>
              </div>
            </div>
            
            {/* Subjective Readiness */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Subjektivní připravenost (1-10)</Label>
                <Badge variant="default" className="text-sm">
                  {context.subjective_readiness_1_10}/10
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {readinessLabels[context.subjective_readiness_1_10 ?? 5]}
              </p>
              <Slider
                value={[context.subjective_readiness_1_10 ?? 5]}
                onValueChange={([v]) => updateField('subjective_readiness_1_10', v)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Další poznámky</Label>
              <Textarea
                value={context.notes ?? ''}
                onChange={e => updateField('notes', e.target.value)}
                placeholder="Cokoliv dalšího, co mohlo ovlivnit výkon..."
                rows={2}
              />
            </div>
            
            <Button onClick={handleSave} disabled={createContext.isPending} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Uložit kontext
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
