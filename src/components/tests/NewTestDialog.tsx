import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ClientPicker } from '@/components/clients/ClientPicker';
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCreateTestSession, useLastMachineSettings } from '@/hooks/useTestSessions';
import type { TestDefinition, MachineSettings, WarmupType, CreateTestSessionInput } from '@/types/tests';
import { cn } from '@/lib/utils';

interface NewTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  definitions: TestDefinition[];
  preselectedDefinitionId?: string;
}

const warmupTypeOptions: { value: WarmupType; label: string }[] = [
  { value: 'general', label: 'Obecné rozcvičení' },
  { value: 'specific', label: 'Specifické rozcvičení' },
  { value: 'mobility_prep', label: 'Mobilita' },
  { value: 'none', label: 'Bez rozcvičení' },
];

export function NewTestDialog({ open, onOpenChange, clientId: initialClientId, definitions, preselectedDefinitionId }: NewTestDialogProps) {
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(preselectedDefinitionId || null);
  
  // Form state
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [metrics, setMetrics] = useState<Record<string, number | string | null>>({});
  const [machineSettings, setMachineSettings] = useState<Partial<MachineSettings>>({});
  const [warmupDone, setWarmupDone] = useState(true);
  const [warmupType, setWarmupType] = useState<WarmupType[]>(['general']);
  const [warmupNotes, setWarmupNotes] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [invalidReason, setInvalidReason] = useState('');
  const [qualityRating, setQualityRating] = useState<number>(3);
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});

  const createSession = useCreateTestSession();

  const selectedDef = definitions.find(d => d.id === selectedDefId);
  
  // Get last machine settings for prefill
  const { data: lastSettings } = useLastMachineSettings(selectedDefId || '', clientId || '');

  // Prefill machine settings from last session
  useEffect(() => {
    if (lastSettings && selectedDef?.device_family) {
      setMachineSettings({
        device_family: lastSettings.device_family,
        resistance_mode: lastSettings.resistance_mode,
        resistance_level_1_10: lastSettings.resistance_level_1_10,
        magnet_1_3: lastSettings.magnet_1_3,
        incline_pct: lastSettings.incline_pct ?? 1,
      });
    } else if (selectedDef?.device_family) {
      setMachineSettings({
        device_family: selectedDef.device_family,
        incline_pct: 1,
      });
    }
  }, [lastSettings, selectedDef]);

  // Reset on dialog close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setMetrics({});
      setChecklistItems({});
      setWarmupDone(true);
      setWarmupType(['general']);
      setWarmupNotes('');
      setIsValid(true);
      setInvalidReason('');
      setQualityRating(3);
      setRpe(5);
      setNotes('');
    }
  }, [open]);

  // Update client when prop changes
  useEffect(() => {
    setClientId(initialClientId);
  }, [initialClientId]);

  // Update selection when preselected changes
  useEffect(() => {
    if (preselectedDefinitionId) {
      setSelectedDefId(preselectedDefinitionId);
    }
  }, [preselectedDefinitionId]);

  const handleSubmit = async () => {
    if (!selectedDef || !clientId) return;

    const input: CreateTestSessionInput = {
      test_definition_id: selectedDef.id,
      client_id: clientId,
      date_time: new Date(dateTime).toISOString(),
      metrics_json: metrics,
      machine_settings_json: selectedDef.device_family ? machineSettings as MachineSettings : undefined,
      warmup_done: warmupDone,
      warmup_type: warmupType,
      warmup_notes: warmupNotes || undefined,
      is_valid: isValid,
      invalid_reason: !isValid ? invalidReason : undefined,
      quality_rating_1_5: qualityRating,
      rpe_1_10: rpe,
      notes: notes || undefined,
    };

    await createSession.mutateAsync({ input, definition: selectedDef });
    onOpenChange(false);
  };

  // Validate resistance mode (mutually exclusive)
  const resistanceError = useMemo(() => {
    if (!selectedDef?.device_family || selectedDef.device_family === 'SkillRun') return null;
    if (!machineSettings.resistance_mode) return 'Vyberte režim odporu';
    if (machineSettings.resistance_mode === 'level_1_10' && !machineSettings.resistance_level_1_10) {
      return 'Nastavte úroveň odporu 1-10';
    }
    if (machineSettings.resistance_mode === 'magnet_1_3' && !machineSettings.magnet_1_3) {
      return 'Nastavte magnetický odpor 1-3';
    }
    return null;
  }, [selectedDef, machineSettings]);

  // Validate incline for SkillRun
  const inclineError = useMemo(() => {
    if (selectedDef?.device_family !== 'SkillRun') return null;
    const incline = machineSettings.incline_pct;
    if (incline == null || incline < 1 || incline > 15) {
      return 'Sklon musí být 1-15%';
    }
    return null;
  }, [selectedDef, machineSettings]);

  const canProceed = () => {
    if (step === 1) return !!clientId;
    if (step === 2) return !!selectedDefId;
    if (step === 3) {
      // Check required metrics
      const reqSchema = selectedDef?.required_metrics_schema || {};
      for (const key of Object.keys(reqSchema)) {
        if (reqSchema[key].required !== false && (metrics[key] == null || metrics[key] === '')) {
          return false;
        }
      }
      // Check machine settings
      if (selectedDef?.device_family) {
        if (resistanceError || inclineError) return false;
      }
      return true;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nový test {step > 1 && selectedDef && `- ${selectedDef.name_cs || selectedDef.name}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Step 1: Select Client */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Klient *</Label>
              <ClientPicker
                value={clientId}
                onChange={setClientId}
                placeholder="Vyberte klienta"
              />
            </div>
          </div>
        )}

        {/* Step 2: Select Test */}
        {step === 2 && (
          <div className="space-y-4">
            <Label>Vyberte test</Label>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {definitions.map(def => (
                <Card
                  key={def.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selectedDefId === def.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedDefId(def.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{def.name_cs || def.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{def.category}</p>
                      </div>
                      {selectedDefId === def.id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Enter Data */}
        {step === 3 && selectedDef && (
          <div className="space-y-6">
            {/* Date/Time */}
            <div className="space-y-2">
              <Label>Datum a čas</Label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
              />
            </div>

            {/* Machine Settings */}
            {selectedDef.device_family && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <Label className="text-base font-semibold">Nastavení stroje ({selectedDef.device_family})</Label>
                
                {(selectedDef.device_family === 'SkillRow' || selectedDef.device_family === 'SkillUp') && (
                  <>
                    <div className="space-y-2">
                      <Label>Režim odporu *</Label>
                      <Select
                        value={machineSettings.resistance_mode || ''}
                        onValueChange={v => setMachineSettings(prev => ({
                          ...prev,
                          resistance_mode: v as 'level_1_10' | 'magnet_1_3',
                          // Clear the other value
                          resistance_level_1_10: v === 'level_1_10' ? prev.resistance_level_1_10 : undefined,
                          magnet_1_3: v === 'magnet_1_3' ? prev.magnet_1_3 : undefined,
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte režim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="level_1_10">Level 1-10</SelectItem>
                          <SelectItem value="magnet_1_3">Magnet 1-3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {machineSettings.resistance_mode === 'level_1_10' && (
                      <div className="space-y-2">
                        <Label>Úroveň odporu (1-10): {machineSettings.resistance_level_1_10 || '-'}</Label>
                        <Slider
                          value={[machineSettings.resistance_level_1_10 || 5]}
                          onValueChange={([v]) => setMachineSettings(prev => ({ ...prev, resistance_level_1_10: v }))}
                          min={1}
                          max={10}
                          step={1}
                        />
                      </div>
                    )}

                    {machineSettings.resistance_mode === 'magnet_1_3' && (
                      <div className="space-y-2">
                        <Label>Magnetický odpor (1-3): {machineSettings.magnet_1_3 || '-'}</Label>
                        <Slider
                          value={[machineSettings.magnet_1_3 || 2]}
                          onValueChange={([v]) => setMachineSettings(prev => ({ ...prev, magnet_1_3: v }))}
                          min={1}
                          max={3}
                          step={1}
                        />
                      </div>
                    )}

                    {resistanceError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> {resistanceError}
                      </p>
                    )}
                  </>
                )}

                {selectedDef.device_family === 'SkillRun' && (
                  <div className="space-y-2">
                    <Label>Sklon (1-15%): {machineSettings.incline_pct || 1}%</Label>
                    <Slider
                      value={[machineSettings.incline_pct || 1]}
                      onValueChange={([v]) => setMachineSettings(prev => ({ ...prev, incline_pct: v }))}
                      min={1}
                      max={15}
                      step={0.5}
                    />
                    {inclineError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> {inclineError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Required Metrics */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Metriky</Label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedDef.required_metrics_schema).map(([key, schema]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">
                      {schema.label} {schema.required !== false && '*'}
                    </Label>
                    <Input
                      type={schema.type === 'number' ? 'number' : 'text'}
                      value={metrics[key] ?? schema.default ?? ''}
                      onChange={e => setMetrics(prev => ({
                        ...prev,
                        [key]: schema.type === 'number' ? Number(e.target.value) : e.target.value
                      }))}
                      min={schema.min}
                      max={schema.max}
                      disabled={schema.readonly}
                    />
                  </div>
                ))}
              </div>

              {/* Optional Metrics */}
              {Object.keys(selectedDef.optional_metrics_schema).length > 0 && (
                <>
                  <Label className="text-sm text-muted-foreground">Doporučené metriky</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedDef.optional_metrics_schema).map(([key, schema]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-sm flex items-center gap-2">
                          {schema.label}
                          <Badge variant="outline" className="text-[10px]">doporučeno</Badge>
                        </Label>
                        <Input
                          type={schema.type === 'number' ? 'number' : 'text'}
                          value={metrics[key] ?? ''}
                          onChange={e => setMetrics(prev => ({
                            ...prev,
                            [key]: schema.type === 'number' ? Number(e.target.value) : e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Warmup */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Rozcvičení</Label>
                <Switch checked={warmupDone} onCheckedChange={setWarmupDone} />
              </div>

              {!warmupDone && (
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Bez rozcvičení bude kvalita hodnocena max 2/5
                </p>
              )}

              {warmupDone && (
                <div className="space-y-2">
                  <Label className="text-sm">Typ rozcvičení</Label>
                  <div className="flex flex-wrap gap-2">
                    {warmupTypeOptions.map(opt => (
                      <Badge
                        key={opt.value}
                        variant={warmupType.includes(opt.value) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          if (warmupType.includes(opt.value)) {
                            setWarmupType(warmupType.filter(t => t !== opt.value));
                          } else {
                            setWarmupType([...warmupType, opt.value]);
                          }
                        }}
                      >
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Poznámky k rozcvičení..."
                    value={warmupNotes}
                    onChange={e => setWarmupNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Standardization Checklist */}
            {selectedDef.standardization_checklist.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Standardizační checklist</Label>
                <div className="space-y-2">
                  {selectedDef.standardization_checklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox
                        id={`check-${i}`}
                        checked={checklistItems[item] || false}
                        onCheckedChange={checked => setChecklistItems(prev => ({ ...prev, [item]: !!checked }))}
                      />
                      <label htmlFor={`check-${i}`} className="text-sm">{item}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validity & Quality */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Validní test</Label>
                  <Switch checked={isValid} onCheckedChange={setIsValid} />
                </div>
                {!isValid && (
                  <Input
                    placeholder="Důvod neplatnosti..."
                    value={invalidReason}
                    onChange={e => setInvalidReason(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Kvalita (1-5): {qualityRating}</Label>
                <Slider
                  value={[warmupDone ? qualityRating : Math.min(qualityRating, 2)]}
                  onValueChange={([v]) => setQualityRating(v)}
                  min={1}
                  max={warmupDone ? 5 : 2}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>RPE (1-10): {rpe}</Label>
              <Slider
                value={[rpe]}
                onValueChange={([v]) => setRpe(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Poznámky</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Zrušit' : 'Zpět'}
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Další
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || createSession.isPending}>
              {createSession.isPending ? 'Ukládám...' : 'Uložit test'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
