import { useEffect, useCallback, useState } from 'react';

/**
 * Hook for tracking unsaved changes and warning user before leaving page
 * @param hasChanges - boolean indicating if there are unsaved changes
 * @param message - optional custom warning message
 */
export function useUnsavedChanges(hasChanges: boolean, message?: string) {
  const warningMessage = message || 'Máte neuložené změny. Opravdu chcete odejít?';

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = warningMessage;
        return warningMessage;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, warningMessage]);
}

/**
 * Hook for managing form dirty state with beforeunload protection
 * Returns isDirty state and setters for marking form as dirty/clean
 */
export function useFormDirtyState(initialDirty = false) {
  const [isDirty, setIsDirty] = useState(initialDirty);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);
  const resetDirty = useCallback(() => setIsDirty(false), []);

  useUnsavedChanges(isDirty);

  return {
    isDirty,
    setIsDirty,
    markDirty,
    markClean,
    resetDirty,
  };
}
