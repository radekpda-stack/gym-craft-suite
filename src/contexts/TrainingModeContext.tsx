import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TrainingModeContextValue {
  isTrainingMode: boolean;
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  enterTrainingMode: () => void;
  exitTrainingMode: () => void;
}

const TrainingModeContext = createContext<TrainingModeContextValue | undefined>(undefined);

interface TrainingModeProviderProps {
  children: ReactNode;
}

export function TrainingModeProvider({ children }: TrainingModeProviderProps) {
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const setActiveSession = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  const enterTrainingMode = useCallback(() => {
    setIsTrainingMode(true);
  }, []);

  const exitTrainingMode = useCallback(() => {
    setIsTrainingMode(false);
    setActiveSessionId(null);
  }, []);

  return (
    <TrainingModeContext.Provider
      value={{
        isTrainingMode,
        activeSessionId,
        setActiveSession,
        enterTrainingMode,
        exitTrainingMode,
      }}
    >
      {children}
    </TrainingModeContext.Provider>
  );
}

export function useTrainingModeContext() {
  const context = useContext(TrainingModeContext);
  if (context === undefined) {
    throw new Error('useTrainingModeContext must be used within a TrainingModeProvider');
  }
  return context;
}
