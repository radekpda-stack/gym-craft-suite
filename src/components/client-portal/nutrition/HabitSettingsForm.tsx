/**
 * HabitSettingsForm - form for configuring client habit settings
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Settings, Droplets, Moon, Coffee, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveHabitSettings, useUpsertHabitSettings } from '@/hooks/useClientHabitSettings';

interface HabitSettingsFormProps {
  clientId: string;
  /** Who is editing - affects sleep_time_last_set_by */
  editedBy?: 'client' | 'trainer';
  /** Show as dialog or inline card */
  mode?: 'dialog' | 'card';
  /** Optional className */
  className?: string;
  /** Trigger button label */
  triggerLabel?: string;
  /** Controlled dialog open state (for mode='dialog') */
  open?: boolean;
  /** Controlled dialog onChange (for mode='dialog') */
  onOpenChange?: (open: boolean) => void;
}

const WATER_PRESETS = [1500, 2000, 2500, 3000];
const CUTOFF_PRESETS = [
  { value: 360, label: '6 hodin' },
  { value: 480, label: '8 hodin' },
  { value: 600, label: '10 hodin' },
];

export function HabitSettingsForm({
  clientId,
  editedBy = 'client',
  mode = 'dialog',
  className,
  triggerLabel = 'Nastavení',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: HabitSettingsFormProps) {
  const { settings, isLoading } = useEffectiveHabitSettings(clientId);
  const upsertSettings = useUpsertHabitSettings();

  // Support both controlled and uncontrolled dialog modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [waterGoal, setWaterGoal] = useState(settings.water_goal_ml);
  const [sleepTime, setSleepTime] = useState(settings.sleep_time || '');
  const [wakeTime, setWakeTime] = useState(settings.wake_time || '');
  const [cutoffMinutes, setCutoffMinutes] = useState(settings.caffeine_cutoff_minutes);

  // Sync form with settings when they load
  useEffect(() => {
    setWaterGoal(settings.water_goal_ml);
    setSleepTime(settings.sleep_time || '');
    setWakeTime(settings.wake_time || '');
    setCutoffMinutes(settings.caffeine_cutoff_minutes);
  }, [settings]);

  const handleSave = async () => {
    await upsertSettings.mutateAsync({
      clientId,
      settings: {
        water_goal_ml: waterGoal,
        sleep_time: sleepTime || null,
        wake_time: wakeTime || null,
        caffeine_cutoff_minutes: cutoffMinutes,
      },
      setBy: editedBy,
    });
    setIsOpen(false);
  };

  const formContent = (
    <div className="space-y-6">
      {/* Water Goal */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <Label className="font-medium">Denní cíl vody</Label>
        </div>
        <div className="flex gap-2">
          {WATER_PRESETS.map(preset => (
            <Button
              key={preset}
              variant={waterGoal === preset ? 'default' : 'outline'}
              size="sm"
              onClick={() => setWaterGoal(preset)}
            >
              {preset / 1000}L
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={waterGoal}
            onChange={(e) => setWaterGoal(parseInt(e.target.value) || 2000)}
            className="w-24"
            min={500}
            max={5000}
            step={100}
          />
          <span className="text-sm text-muted-foreground">ml</span>
        </div>
      </div>

      {/* Sleep Time */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-indigo-500" />
          <Label className="font-medium">Čas spánku</Label>
        </div>
        <Input
          type="time"
          value={sleepTime}
          onChange={(e) => setSleepTime(e.target.value)}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          Používá se pro výpočet kofeinového okna
        </p>
      </div>

      {/* Wake Time (optional) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-amber-500" />
          <Label className="font-medium">Čas probuzení (volitelné)</Label>
        </div>
        <Input
          type="time"
          value={wakeTime}
          onChange={(e) => setWakeTime(e.target.value)}
          className="w-32"
        />
      </div>

      {/* Caffeine Cutoff */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-amber-700" />
          <Label className="font-medium">Odstup od kofeinu</Label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CUTOFF_PRESETS.map(preset => (
            <Button
              key={preset.value}
              variant={cutoffMinutes === preset.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCutoffMinutes(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Kofein {cutoffMinutes / 60} hodin před spánkem = varování
        </p>
      </div>
    </div>
  );

  if (mode === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Nastavení návyků
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {formContent}
              <Button
                className="w-full mt-6"
                onClick={handleSave}
                disabled={upsertSettings.isPending}
              >
                {upsertSettings.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Uložit nastavení
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Controlled mode - no trigger button
  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Nastavení návyků
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            formContent
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={upsertSettings.isPending}
            >
              Zrušit
            </Button>
            <Button
              onClick={handleSave}
              disabled={upsertSettings.isPending}
            >
              {upsertSettings.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Settings className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Nastavení návyků
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          formContent
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={upsertSettings.isPending}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertSettings.isPending}
          >
            {upsertSettings.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
