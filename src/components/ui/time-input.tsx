/**
 * TimeInput Component
 * 
 * Input for high-precision time entry (with centiseconds).
 * Supports formats: mm:ss, mm:ss.SS, ss, ss.SS
 * 
 * @example
 * <TimeInput value={101350} onChange={(ms) => setTimeMs(ms)} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { formatTimeMs, parseTimeToMs, isValidTimeInput } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  /** Time value in milliseconds */
  value: number | null | undefined;
  /** Called when time changes, with value in milliseconds */
  onChange: (ms: number | null) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Show full format with centiseconds always */
  showCentiseconds?: boolean;
}

export function TimeInput({
  value,
  onChange,
  placeholder = "0:00",
  className,
  disabled = false,
  showCentiseconds = false,
}: TimeInputProps) {
  // Display value as formatted time
  const [displayValue, setDisplayValue] = useState(() => 
    value ? formatTimeMs(value) : ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sync display value when prop changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value ? formatTimeMs(value) : '');
    }
  }, [value, isEditing]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setHasError(false);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    
    if (!displayValue.trim()) {
      onChange(null);
      setHasError(false);
      return;
    }

    const ms = parseTimeToMs(displayValue);
    if (ms !== null) {
      onChange(ms);
      setDisplayValue(formatTimeMs(ms));
      setHasError(false);
    } else {
      setHasError(true);
      // Keep the invalid value visible so user can fix it
    }
  }, [displayValue, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    setHasError(false);
    
    // Real-time validation feedback
    if (newValue && !isValidTimeInput(newValue)) {
      // Only show error if it looks like they're done typing
      if (newValue.includes(':') || newValue.length > 3) {
        // Don't set error yet, wait for blur
      }
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      title="Formát: mm:ss nebo mm:ss.SS (např. 1:41.35)"
    />
  );
}

/**
 * Display-only time component
 */
interface TimeDisplayProps {
  /** Time value in milliseconds */
  value: number | null | undefined;
  /** Fallback text when no value */
  fallback?: string;
  /** Additional class names */
  className?: string;
}

export function TimeDisplay({ value, fallback = '-', className }: TimeDisplayProps) {
  if (value === null || value === undefined) {
    return <span className={cn("text-muted-foreground", className)}>{fallback}</span>;
  }
  
  return <span className={className}>{formatTimeMs(value)}</span>;
}
