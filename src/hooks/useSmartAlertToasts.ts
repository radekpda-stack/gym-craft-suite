import { useState, useEffect, useCallback, useRef } from 'react';
import { useSmartAlerts, type SmartAlert } from './useSmartAlerts';

const SHOWN_ALERTS_KEY = 'shown-smart-alerts';
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

interface ShownAlert {
  id: string;
  shownAt: number;
}

function getShownAlerts(): ShownAlert[] {
  try {
    const stored = localStorage.getItem(SHOWN_ALERTS_KEY);
    if (!stored) return [];
    
    const alerts: ShownAlert[] = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out old alerts (older than cooldown)
    return alerts.filter(a => now - a.shownAt < ALERT_COOLDOWN_MS);
  } catch {
    return [];
  }
}

function markAlertShown(id: string) {
  const shown = getShownAlerts();
  shown.push({ id, shownAt: Date.now() });
  localStorage.setItem(SHOWN_ALERTS_KEY, JSON.stringify(shown));
}

function isAlertShown(id: string): boolean {
  const shown = getShownAlerts();
  return shown.some(a => a.id === id);
}

export function useSmartAlertToasts() {
  const { data: alerts = [] } = useSmartAlerts();
  const [pendingAlerts, setPendingAlerts] = useState<SmartAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SmartAlert[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Process new alerts
  useEffect(() => {
    if (alerts.length === 0) return;

    const newAlerts = alerts.filter(alert => {
      // Skip if already processed in this session
      if (processedIdsRef.current.has(alert.id)) return false;
      
      // Skip if shown recently
      if (isAlertShown(alert.id)) return false;
      
      return true;
    });

    if (newAlerts.length > 0) {
      // Mark as processed
      newAlerts.forEach(a => processedIdsRef.current.add(a.id));
      
      // Add to pending queue
      setPendingAlerts(prev => [...prev, ...newAlerts]);
    }
  }, [alerts]);

  // Show alerts from pending queue (staggered)
  useEffect(() => {
    if (pendingAlerts.length === 0 || activeAlerts.length >= 3) return;

    const timer = setTimeout(() => {
      const [next, ...rest] = pendingAlerts;
      if (next) {
        setActiveAlerts(prev => [...prev, next]);
        setPendingAlerts(rest);
        markAlertShown(next.id);
      }
    }, activeAlerts.length === 0 ? 2000 : 500); // Delay first alert, quick succession for others

    return () => clearTimeout(timer);
  }, [pendingAlerts, activeAlerts]);

  const dismissAlert = useCallback((id: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setActiveAlerts([]);
    setPendingAlerts([]);
  }, []);

  return {
    alerts: activeAlerts,
    pendingCount: pendingAlerts.length,
    dismissAlert,
    dismissAll,
  };
}
