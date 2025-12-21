import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface UndoAction {
  id: string;
  label: string;
  description?: string;
  undoFn: () => Promise<void>;
  expiresAt: number;
  category: 'credit' | 'training' | 'client' | 'other';
}

interface UndoContextType {
  currentAction: UndoAction | null;
  registerUndo: (action: Omit<UndoAction, 'id' | 'expiresAt'>) => void;
  executeUndo: () => Promise<void>;
  dismissUndo: () => void;
  isExecuting: boolean;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

const UNDO_TIMEOUT_MS = 5000; // 5 seconds

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const dismissUndo = useCallback(() => {
    clearTimeout();
    setCurrentAction(null);
  }, [clearTimeout]);

  const registerUndo = useCallback((action: Omit<UndoAction, 'id' | 'expiresAt'>) => {
    // Clear any existing undo action
    clearTimeout();
    
    const newAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      expiresAt: Date.now() + UNDO_TIMEOUT_MS,
    };
    
    setCurrentAction(newAction);
    
    // Auto-dismiss after timeout
    timeoutRef.current = globalThis.setTimeout(() => {
      setCurrentAction(null);
    }, UNDO_TIMEOUT_MS);
  }, [clearTimeout]);

  const executeUndo = useCallback(async () => {
    if (!currentAction || isExecuting) return;
    
    setIsExecuting(true);
    clearTimeout();
    
    try {
      await currentAction.undoFn();
      setCurrentAction(null);
    } catch (error) {
      console.error('Failed to execute undo:', error);
      // Keep the action visible on error so user can try again
    } finally {
      setIsExecuting(false);
    }
  }, [currentAction, isExecuting, clearTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout();
    };
  }, [clearTimeout]);

  return (
    <UndoContext.Provider value={{ currentAction, registerUndo, executeUndo, dismissUndo, isExecuting }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (context === undefined) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}
