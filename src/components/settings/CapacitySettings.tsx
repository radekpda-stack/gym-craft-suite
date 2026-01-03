import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCapacitySettings, calculateMonthlyCapacity, type CapacitySettings as CapacitySettingsType } from '@/hooks/useCapacitySettings';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Clock, Calendar, Zap } from 'lucide-react';

const DAYS_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const SLOT_DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];

const PRESETS: { label: string; icon: React.ReactNode; settings: Partial<CapacitySettingsType> }[] = [
  {
    label: '6h denně vč. víkendů',
    icon: <Calendar className="w-4 h-4" />,
    settings: {
      workingDays: [true, true, true, true, true, true, true],
      workingHoursStart: '09:00',
      workingHoursEnd: '15:00',
    },
  },
  {
    label: '8h pracovní dny',
    icon: <Clock className="w-4 h-4" />,
    settings: {
      workingDays: [true, true, true, true, true, false, false],
      workingHoursStart: '08:00',
      workingHoursEnd: '16:00',
    },
  },
  {
    label: 'Part-time 4h',
    icon: <Zap className="w-4 h-4" />,
    settings: {
      workingDays: [true, true, true, true, true, false, false],
      workingHoursStart: '09:00',
      workingHoursEnd: '13:00',
    },
  },
];

export function CapacitySettingsPanel() {
  const { settings, isLoading, saveSettings, isSaving } = useCapacitySettings();
  
  const [localSettings, setLocalSettings] = useState<CapacitySettingsType>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Calculate capacity preview
  const capacityPreview = useMemo(() => {
    return calculateMonthlyCapacity(localSettings, 30);
  }, [localSettings]);

  const handleSave = () => {
    saveSettings(localSettings, {
      onSuccess: () => {
        toast({
          title: 'Nastavení uloženo',
          description: 'Pracovní doba byla aktualizována.',
        });
      },
      onError: () => {
        toast({
          title: 'Chyba',
          description: 'Nepodařilo se uložit nastavení.',
          variant: 'destructive',
        });
      },
    });
  };

  const toggleDay = (index: number) => {
    const newDays = [...localSettings.workingDays];
    newDays[index] = !newDays[index];
    setLocalSettings({ ...localSettings, workingDays: newDays });
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setLocalSettings({ ...localSettings, ...preset.settings });
    toast({
      title: 'Preset aplikován',
      description: preset.label,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacity Preview */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="text-sm text-muted-foreground mb-1">Měsíční kapacita</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{capacityPreview.totalSlots}</span>
          <span className="text-muted-foreground">slotů/měsíc</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {capacityPreview.workingDaysCount} pracovních dní × {capacityPreview.hoursPerDay.toFixed(1)}h = {Math.round(capacityPreview.workingDaysCount * capacityPreview.hoursPerDay)} hodin
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Rychlé presety</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="gap-2"
            >
              {preset.icon}
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Working days */}
      <div className="space-y-3">
        <Label className="text-foreground">Pracovní dny</Label>
        <div className="flex gap-2">
          {DAYS_LABELS.map((day, index) => (
            <button
              key={day}
              onClick={() => toggleDay(index)}
              className={`
                w-10 h-10 rounded-lg text-sm font-medium transition-all
                ${localSettings.workingDays[index]
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }
              `}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Začátek</Label>
          <Input
            type="time"
            value={localSettings.workingHoursStart}
            onChange={(e) => setLocalSettings({ ...localSettings, workingHoursStart: e.target.value })}
            className="glass-input rounded-xl text-center"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Konec</Label>
          <Input
            type="time"
            value={localSettings.workingHoursEnd}
            onChange={(e) => setLocalSettings({ ...localSettings, workingHoursEnd: e.target.value })}
            className="glass-input rounded-xl text-center"
          />
        </div>
      </div>

      {/* Slot duration */}
      <div className="space-y-2">
        <Label className="text-foreground">Délka slotu</Label>
        <Select
          value={String(localSettings.slotDurationMinutes)}
          onValueChange={(value) => setLocalSettings({ ...localSettings, slotDurationMinutes: Number(value) })}
        >
          <SelectTrigger className="w-full glass-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLOT_DURATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Include blocked time */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-foreground">Zahrnout blokace</Label>
          <p className="text-sm text-muted-foreground">
            Počítat dovolené a soukromé bloky jako nedostupnou kapacitu
          </p>
        </div>
        <Switch
          checked={localSettings.includeBlockedTime}
          onCheckedChange={(checked) => setLocalSettings({ ...localSettings, includeBlockedTime: checked })}
        />
      </div>

      {/* Save button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Ukládám...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Uložit nastavení
          </>
        )}
      </Button>
    </div>
  );
}
