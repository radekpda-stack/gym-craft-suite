/**
 * QuickAddTimeDialog - Dialog for selecting time when quick-adding water/coffee
 * Ensures every entry has a consumption time as per the habit diary requirements
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Droplets, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { TIME_PRESETS } from './constants';

interface QuickAddTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'water' | 'coffee';
  /** For water: amount in ml, for coffee: 'espresso' | 'tea' */
  value?: number | string;
  onConfirm: (time: string) => void;
  isPending?: boolean;
}

export function QuickAddTimeDialog({
  open,
  onOpenChange,
  type,
  value,
  onConfirm,
  isPending = false,
}: QuickAddTimeDialogProps) {
  const [time, setTime] = useState(() => format(new Date(), 'HH:mm'));

  // Reset time to now when dialog opens
  useEffect(() => {
    if (open) {
      setTime(format(new Date(), 'HH:mm'));
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(time);
  };

  const handlePresetClick = (presetTime: string) => {
    if (presetTime === 'now') {
      setTime(format(new Date(), 'HH:mm'));
    } else {
      setTime(presetTime);
    }
  };

  const getTitle = () => {
    if (type === 'water') {
      return `Přidat ${value}ml vody`;
    }
    return value === 'tea' ? 'Přidat čaj' : 'Přidat kávu';
  };

  const getIcon = () => {
    if (type === 'water') {
      return <Droplets className="w-5 h-5 text-blue-500" />;
    }
    return <Coffee className="w-5 h-5 text-amber-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Time Input - wrapped in container to prevent overflow */}
          <div className="space-y-2">
            <Label htmlFor="entry-time" className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Čas konzumace
            </Label>
            <div className="relative w-full">
              <Input
                id="entry-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-lg h-12 text-center font-mono w-full"
              />
            </div>
          </div>

          {/* Time Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Rychlá volba</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_PRESETS.map((preset) => (
                <Button
                  key={preset.time}
                  type="button"
                  variant={time === preset.time || (preset.time === 'now' && time === format(new Date(), 'HH:mm')) ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetClick(preset.time)}
                  className="h-9 text-xs"
                >
                  <span className="mr-1">{preset.icon}</span>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 flex-row justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !time}
          >
            {isPending ? 'Ukládám...' : 'Přidat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
