/**
 * TimePickerSelect Component
 * 
 * Clickable time selector with dropdowns for minutes, seconds, and centiseconds.
 * Format: M : SS . CC
 * 
 * @example
 * <TimePickerSelect value={101350} onChange={(ms) => setTimeMs(ms)} />
 */

import React, { useMemo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimePickerSelectProps {
  /** Time value in milliseconds */
  value: number | null | undefined;
  /** Called when time changes, with value in milliseconds */
  onChange: (ms: number | null) => void;
  /** Maximum minutes (default 9) */
  maxMinutes?: number;
  /** Show centiseconds selectors (default true) */
  showCentiseconds?: boolean;
  /** Additional class names */
  className?: string;
  /** Disable the inputs */
  disabled?: boolean;
}

export function TimePickerSelect({
  value,
  onChange,
  maxMinutes = 9,
  showCentiseconds = true,
  className,
  disabled = false,
}: TimePickerSelectProps) {
  // Parse milliseconds to individual components
  const parsed = useMemo(() => {
    if (value === null || value === undefined || value < 0) {
      return { minutes: 0, secondsTens: 0, secondsUnits: 0, csTens: 0, csUnits: 0 };
    }
    
    const totalSeconds = value / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.round((totalSeconds % 1) * 100);
    
    return {
      minutes: Math.min(minutes, maxMinutes),
      secondsTens: Math.floor(seconds / 10),
      secondsUnits: seconds % 10,
      csTens: Math.floor(centiseconds / 10),
      csUnits: centiseconds % 10,
    };
  }, [value, maxMinutes]);

  // Calculate milliseconds from components
  const calculateMs = useCallback((
    minutes: number,
    secondsTens: number,
    secondsUnits: number,
    csTens: number,
    csUnits: number
  ): number => {
    const totalSeconds = minutes * 60 + secondsTens * 10 + secondsUnits;
    const centiseconds = csTens * 10 + csUnits;
    return totalSeconds * 1000 + centiseconds * 10;
  }, []);

  const handleChange = useCallback((field: string, val: string) => {
    const numVal = parseInt(val, 10);
    let newMs: number;
    
    switch (field) {
      case 'minutes':
        newMs = calculateMs(numVal, parsed.secondsTens, parsed.secondsUnits, parsed.csTens, parsed.csUnits);
        break;
      case 'secondsTens':
        newMs = calculateMs(parsed.minutes, numVal, parsed.secondsUnits, parsed.csTens, parsed.csUnits);
        break;
      case 'secondsUnits':
        newMs = calculateMs(parsed.minutes, parsed.secondsTens, numVal, parsed.csTens, parsed.csUnits);
        break;
      case 'csTens':
        newMs = calculateMs(parsed.minutes, parsed.secondsTens, parsed.secondsUnits, numVal, parsed.csUnits);
        break;
      case 'csUnits':
        newMs = calculateMs(parsed.minutes, parsed.secondsTens, parsed.secondsUnits, parsed.csTens, numVal);
        break;
      default:
        return;
    }
    
    onChange(newMs > 0 ? newMs : null);
  }, [parsed, calculateMs, onChange]);

  // Generate options
  const minuteOptions = useMemo(() => 
    Array.from({ length: maxMinutes + 1 }, (_, i) => i), 
    [maxMinutes]
  );
  
  const zeroToNine = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => i), 
    []
  );
  
  const zeroToFive = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => i), 
    []
  );

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Minutes */}
      <Select
        value={parsed.minutes.toString()}
        onValueChange={(val) => handleChange('minutes', val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-14 h-10 px-2 text-center font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((n) => (
            <SelectItem key={n} value={n.toString()} className="font-mono">
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-lg font-bold text-muted-foreground">:</span>

      {/* Seconds - Tens (0-5) */}
      <Select
        value={parsed.secondsTens.toString()}
        onValueChange={(val) => handleChange('secondsTens', val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-14 h-10 px-2 text-center font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {zeroToFive.map((n) => (
            <SelectItem key={n} value={n.toString()} className="font-mono">
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Seconds - Units (0-9) */}
      <Select
        value={parsed.secondsUnits.toString()}
        onValueChange={(val) => handleChange('secondsUnits', val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-14 h-10 px-2 text-center font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {zeroToNine.map((n) => (
            <SelectItem key={n} value={n.toString()} className="font-mono">
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCentiseconds && (
        <>
          <span className="text-lg font-bold text-muted-foreground">.</span>

          {/* Centiseconds - Tens (0-9) */}
          <Select
            value={parsed.csTens.toString()}
            onValueChange={(val) => handleChange('csTens', val)}
            disabled={disabled}
          >
            <SelectTrigger className="w-14 h-10 px-2 text-center font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zeroToNine.map((n) => (
                <SelectItem key={n} value={n.toString()} className="font-mono">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Centiseconds - Units (0-9) */}
          <Select
            value={parsed.csUnits.toString()}
            onValueChange={(val) => handleChange('csUnits', val)}
            disabled={disabled}
          >
            <SelectTrigger className="w-14 h-10 px-2 text-center font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zeroToNine.map((n) => (
                <SelectItem key={n} value={n.toString()} className="font-mono">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
