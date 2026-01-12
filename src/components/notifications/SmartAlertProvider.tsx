import { createContext, useContext, ReactNode } from 'react';
import { SmartAlertContainer } from './SmartAlertToast';
import { useSmartAlertToasts } from '@/hooks/useSmartAlertToasts';

interface SmartAlertContextType {
  pendingCount: number;
  dismissAll: () => void;
}

const SmartAlertContext = createContext<SmartAlertContextType | null>(null);

export function useSmartAlertContext() {
  return useContext(SmartAlertContext);
}

interface SmartAlertProviderProps {
  children: ReactNode;
}

export function SmartAlertProvider({ children }: SmartAlertProviderProps) {
  const { alerts, pendingCount, dismissAlert, dismissAll } = useSmartAlertToasts();

  return (
    <SmartAlertContext.Provider value={{ pendingCount, dismissAll }}>
      {children}
      <SmartAlertContainer alerts={alerts} onDismiss={dismissAlert} />
    </SmartAlertContext.Provider>
  );
}
