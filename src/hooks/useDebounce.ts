import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook pro debounce hodnoty
 * @param value - Hodnota k debounce
 * @param delay - Zpoždění v ms (default 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pro debounced callback
 * @param callback - Funkce k debounce
 * @param delay - Zpoždění v ms (default 300)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 300
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  return debouncedCallback;
}

/**
 * Hook pro throttle callback (max 1 volání za interval)
 * @param callback - Funkce k throttle
 * @param limit - Minimální interval mezi voláními v ms (default 300)
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit = 300
): T {
  const lastRanRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRanRef.current >= limit) {
        lastRanRef.current = now;
        callbackRef.current(...args);
      }
    },
    [limit]
  ) as T;

  return throttledCallback;
}

/**
 * Hook pro předchozí hodnotu
 * @param value - Aktuální hodnota
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}
