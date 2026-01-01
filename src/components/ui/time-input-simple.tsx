import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeInputSimpleProps {
  value: number | null | undefined;
  onChange: (ms: number | null) => void;
  showCentiseconds?: boolean;
  maxMinutes?: number;
  className?: string;
  disabled?: boolean;
}

export function TimeInputSimple({
  value,
  onChange,
  showCentiseconds = true,
  maxMinutes = 59,
  className,
  disabled = false,
}: TimeInputSimpleProps) {
  // Parse ms to components
  const parseMs = useCallback((ms: number | null | undefined) => {
    if (ms === null || ms === undefined) {
      return { minutes: '', seconds: '', centiseconds: '' };
    }
    const totalCs = Math.round(ms / 10);
    const cs = totalCs % 100;
    const totalSeconds = Math.floor(totalCs / 100);
    const sec = totalSeconds % 60;
    const min = Math.floor(totalSeconds / 60);
    return {
      minutes: min > 0 ? String(min) : '',
      seconds: String(sec).padStart(min > 0 ? 2 : 1, '0'),
      centiseconds: String(cs).padStart(2, '0'),
    };
  }, []);

  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [centiseconds, setCentiseconds] = useState('');

  // Sync from value prop
  useEffect(() => {
    const parsed = parseMs(value);
    setMinutes(parsed.minutes);
    setSeconds(parsed.seconds);
    setCentiseconds(parsed.centiseconds);
  }, [value, parseMs]);

  const calculateMs = useCallback((min: string, sec: string, cs: string): number | null => {
    const minNum = parseInt(min) || 0;
    const secNum = parseInt(sec) || 0;
    const csNum = parseInt(cs) || 0;

    if (minNum === 0 && secNum === 0 && csNum === 0 && !min && !sec && !cs) {
      return null;
    }

    return (minNum * 60 * 1000) + (secNum * 1000) + (csNum * 10);
  }, []);

  const handleMinutesChange = (val: string) => {
    const num = val.replace(/\D/g, '');
    const clamped = num ? Math.min(parseInt(num), maxMinutes).toString() : '';
    setMinutes(clamped);
    onChange(calculateMs(clamped, seconds, centiseconds));
  };

  const handleSecondsChange = (val: string) => {
    const num = val.replace(/\D/g, '');
    const clamped = num ? Math.min(parseInt(num), 59).toString() : '';
    setSeconds(clamped);
    onChange(calculateMs(minutes, clamped, centiseconds));
  };

  const handleCentisecondsChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    setCentiseconds(num);
    onChange(calculateMs(minutes, seconds, num));
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Minutes */}
      <div className="flex flex-col items-center">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={minutes}
          onChange={(e) => handleMinutesChange(e.target.value)}
          placeholder="0"
          disabled={disabled}
          className="w-14 h-11 text-center text-lg font-medium px-1"
        />
        <span className="text-[10px] text-muted-foreground mt-0.5">min</span>
      </div>

      <span className="text-xl font-bold text-muted-foreground pb-4">:</span>

      {/* Seconds */}
      <div className="flex flex-col items-center">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={seconds}
          onChange={(e) => handleSecondsChange(e.target.value)}
          placeholder="00"
          disabled={disabled}
          className="w-14 h-11 text-center text-lg font-medium px-1"
        />
        <span className="text-[10px] text-muted-foreground mt-0.5">sek</span>
      </div>

      {showCentiseconds && (
        <>
          <span className="text-xl font-bold text-muted-foreground pb-4">.</span>

          {/* Centiseconds */}
          <div className="flex flex-col items-center">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={centiseconds}
              onChange={(e) => handleCentisecondsChange(e.target.value)}
              placeholder="00"
              disabled={disabled}
              className="w-14 h-11 text-center text-lg font-medium px-1"
            />
            <span className="text-[10px] text-muted-foreground mt-0.5">cs</span>
          </div>
        </>
      )}
    </div>
  );
}
