/**
 * HabitSettingsForm - form for configuring client habit settings
 */

import { useState, useEffect, useMemo } from 'react';
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

  const initialFormState = useMemo(
    () => ({
      waterGoal: settings.water_goal_ml,
      sleepTime: settings.sleep_time || '',
      wakeTime: settings.wake_time || '',
      cutoffMinutes: settings.caffeine_cutoff_minutes,
    }),
    [settings]
  );

  // Support both controlled and uncontrolled dialog modes
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [isDirty, setIsDirty] = useState(false);
  const [waterGoal, setWaterGoal] = useState(initialFormState.waterGoal);
  const [sleepTime, setSleepTime] = useState(initialFormState.sleepTime);
  const [wakeTime, setWakeTime] = useState(initialFormState.wakeTime);
  const [cutoffMinutes, setCutoffMinutes] = useState(initialFormState.cutoffMinutes);

  // Prevent background refetch from overwriting in-progress edits.
  // - dialog mode: hydrate only when opened AND user hasn't edited
  // - card mode: hydrate on settings change, but only if user hasn't edited
  useEffect(() => {
    if (mode === 'dialog') {
      if (!isOpen) {
        // When dialog closes, reset dirty so next open hydrates cleanly.
        setIsDirty(false);
        return;
      }
      if (isDirty) return;
    } else {
      if (isDirty) return;
    }

    setWaterGoal(initialFormState.waterGoal);
    setSleepTime(initialFormState.sleepTime);
    setWakeTime(initialFormState.wakeTime);
    setCutoffMinutes(initialFormState.cutoffMinutes);
  }, [initialFormState, isDirty, isOpen, mode]);

  const handleSave = async () => {
    try {
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
      setIsDirty(false);
      setIsOpen(false);
    } catch {
      // toast is handled in the mutation; keep dialog open so user can retry.
    }
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
              type="button"
              onClick={() => {
                setIsDirty(true);
                setWaterGoal(preset);
              }}
            >
              {preset / 1000}L
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={waterGoal}
            onChange={(e) => {
              setIsDirty(true);
              // Allow empty while typing; fall back on blur.
              const next = e.target.value;
              setWaterGoal(next === '' ? 0 : Number(next));
            }}
            onBlur={() => {
              // Clamp and normalize
              const clamped = Math.min(5000, Math.max(500, waterGoal || 2000));
              if (clamped !== waterGoal) setWaterGoal(clamped);
            }}
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
          onChange={(e) => {
            setIsDirty(true);
            setSleepTime(e.target.value);
          }}
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
          onChange={(e) => {
            setIsDirty(true);
            setWakeTime(e.target.value);
          }}
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
              type="button"
              onClick={() => {
                setIsDirty(true);
                setCutoffMinutes(preset.value);
              }}
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
