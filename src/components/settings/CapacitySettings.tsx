import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCapacitySettings, type CapacitySettings as CapacitySettingsType } from '@/hooks/useCapacitySettings';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Check } from 'lucide-react';

const DAYS_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

const SLOT_DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
];

export function CapacitySettingsPanel() {
  const { settings, isConfigured, isLoading, saveSettings, isSaving } = useCapacitySettings();
  
  const [localSettings, setLocalSettings] = useState<CapacitySettingsType>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    saveSettings(localSettings, {
      onSuccess: () => {
        toast({
          title: 'Nastavení uloženo',
          description: 'Kapacita kalendáře byla aktualizována.',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {isConfigured && (
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          Kapacita je nakonfigurována
        </p>
      )}
    </div>
  );
}
