/**
 * usePerformance - Hook for tracking performance metrics
 * 
 * Tracks Core Web Vitals and custom performance metrics.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager, getDeviceType } from '../SessionManager';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  pageLoad?: number;
  domReady?: number;
  tti?: number;
}

export function usePerformance() {
  const location = useLocation();
  const metrics = useRef<PerformanceMetrics>({});
  const savedRef = useRef(false);
  const userId = useRef<string | null>(null);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userId.current = data.user?.id || null;
    });
  }, []);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      metrics.current.ttfb = Math.round(navigation.responseStart - navigation.requestStart);
      metrics.current.domReady = Math.round(navigation.domContentLoadedEventEnd - navigation.startTime);
      metrics.current.pageLoad = Math.round(navigation.loadEventEnd - navigation.startTime);
    }

    // Get paint timings
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      metrics.current.fcp = Math.round(fcp.startTime);
    }
  }, []);

  // Save metrics to database
  const saveMetrics = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;

    collectMetrics();

    const m = metrics.current;
    if (!m.pageLoad && !m.fcp && !m.ttfb) return;

    try {
      // Get connection type if available
      let connectionType: string | undefined;
      const nav = navigator as any;
      if (nav.connection) {
        connectionType = nav.connection.effectiveType || nav.connection.type;
      }

      await supabase.from('performance_metrics').insert({
        user_id: userId.current,
        session_id: sessionManager.getSessionId(),
        route: location.pathname,
        lcp_ms: m.lcp,
        fid_ms: m.fid,
        cls: m.cls,
        fcp_ms: m.fcp,
        ttfb_ms: m.ttfb,
        page_load_ms: m.pageLoad,
        dom_ready_ms: m.domReady,
        time_to_interactive_ms: m.tti,
        device_type: getDeviceType(),
        connection_type: connectionType,
      });
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }, [collectMetrics, location.pathname]);

  // Set up observers for Web Vitals
  useEffect(() => {
    savedRef.current = false;
    metrics.current = {};

    // LCP Observer
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.current.lcp = Math.round(lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const firstInput = entries[0] as PerformanceEventTiming;
            metrics.current.fid = Math.round(firstInput.processingStart - firstInput.startTime);
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          metrics.current.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Clean up and save on page leave
        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          saveMetrics();
        };
      } catch (e) {
        // Observer not supported
      }
    }

    // Fallback: save on load
    const handleLoad = () => {
      setTimeout(() => {
        saveMetrics();
      }, 3000); // Wait for LCP to settle
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [location.pathname, saveMetrics]);

  // Manual metric tracking
  const trackCustomMetric = useCallback((name: string, value: number) => {
    (metrics.current as any)[name] = value;
  }, []);

  return {
    trackCustomMetric,
    getMetrics: () => ({ ...metrics.current }),
  };
}

// Helper to measure component render time
export function measureRenderTime(componentName: string): () => void {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    console.debug(`[Render] ${componentName}: ${duration.toFixed(2)}ms`);
  };
}
