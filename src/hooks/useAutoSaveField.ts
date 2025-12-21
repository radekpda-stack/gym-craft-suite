import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAutoSaveFieldOptions {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  debounceMs?: number;
}

export function useAutoSaveField({
  initialValue,
  onSave,
  debounceMs = 500,
}: UseAutoSaveFieldOptions) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialValueRef = useRef(initialValue);

  // Update value when initialValue changes (e.g., data refresh)
  useEffect(() => {
    if (initialValue !== initialValueRef.current) {
      setValue(initialValue);
      initialValueRef.current = initialValue;
    }
  }, [initialValue]);

  const handleBlur = useCallback(async () => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only save if value has changed
    if (value !== initialValueRef.current) {
      setIsSaving(true);
      try {
        await onSave(value);
        setLastSaved(new Date());
        initialValueRef.current = value;
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  }, [value, onSave]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    isSaving,
    lastSaved,
  };
}
