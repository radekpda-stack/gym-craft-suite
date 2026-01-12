import { useState, useCallback, useRef } from 'react';
import { haptic } from '@/lib/haptics';
import { fireConfetti, ConfettiPreset } from '@/lib/confetti';

interface ProgressOperationOptions {
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  hapticOnComplete?: boolean;
  confettiOnComplete?: ConfettiPreset | false;
  estimatedDurationMs?: number;
}

interface ProgressState {
  isRunning: boolean;
  progress: number;
  message: string;
  error: Error | null;
}

/**
 * Hook for managing long-running operations with progress tracking
 */
export function useProgressOperation(options: ProgressOperationOptions = {}) {
  const {
    onStart,
    onProgress,
    onComplete,
    onError,
    hapticOnComplete = true,
    confettiOnComplete = false,
    estimatedDurationMs,
  } = options;

  const [state, setState] = useState<ProgressState>({
    isRunning: false,
    progress: 0,
    message: '',
    error: null,
  });

  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startSimulatedProgress = useCallback(() => {
    if (!estimatedDurationMs) return;

    startTimeRef.current = Date.now();
    
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      // Asymptotic progress - gets slower as it approaches 90%
      const progress = Math.min(90, (elapsed / estimatedDurationMs) * 100 * 0.9);
      
      setState(prev => ({ ...prev, progress }));
      onProgress?.(progress);
    }, 100);
  }, [estimatedDurationMs, onProgress]);

  const stopSimulatedProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const start = useCallback((message: string = 'Zpracovávám...') => {
    haptic('light');
    setState({
      isRunning: true,
      progress: 0,
      message,
      error: null,
    });
    onStart?.();
    startSimulatedProgress();
  }, [onStart, startSimulatedProgress]);

  const setProgress = useCallback((progress: number, message?: string) => {
    stopSimulatedProgress();
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message ?? prev.message,
    }));
    onProgress?.(progress);
  }, [onProgress, stopSimulatedProgress]);

  const setMessage = useCallback((message: string) => {
    setState(prev => ({ ...prev, message }));
  }, []);

  const complete = useCallback((message?: string) => {
    stopSimulatedProgress();
    setState({
      isRunning: false,
      progress: 100,
      message: message ?? 'Dokončeno',
      error: null,
    });
    
    if (hapticOnComplete) {
      haptic('success');
    }
    
    if (confettiOnComplete) {
      fireConfetti(confettiOnComplete);
    }
    
    onComplete?.();
  }, [hapticOnComplete, confettiOnComplete, onComplete, stopSimulatedProgress]);

  const fail = useCallback((error: Error, message?: string) => {
    stopSimulatedProgress();
    haptic('error');
    setState({
      isRunning: false,
      progress: 0,
      message: message ?? error.message,
      error,
    });
    onError?.(error);
  }, [onError, stopSimulatedProgress]);

  const reset = useCallback(() => {
    stopSimulatedProgress();
    setState({
      isRunning: false,
      progress: 0,
      message: '',
      error: null,
    });
  }, [stopSimulatedProgress]);

  /**
   * Execute an async function with automatic progress tracking
   */
  const execute = useCallback(
    async <T,>(
      fn: (setProgress: (progress: number, message?: string) => void) => Promise<T>,
      startMessage: string = 'Zpracovávám...'
    ): Promise<T | null> => {
      start(startMessage);
      
      try {
        const result = await fn(setProgress);
        complete();
        return result;
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    },
    [start, setProgress, complete, fail]
  );

  return {
    ...state,
    start,
    setProgress,
    setMessage,
    complete,
    fail,
    reset,
    execute,
  };
}
