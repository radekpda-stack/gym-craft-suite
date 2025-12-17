import { useRef, useEffect } from 'react';

const RENDER_THRESHOLD = 50; // Max renders in time window before logging
const TIME_WINDOW_MS = 1000; // 1 second window

interface RenderLog {
  component: string;
  renderCount: number;
  timestamp: string;
  stackTrace?: string;
}

// Global render tracking
const renderCounts = new Map<string, { count: number; firstRender: number }>();

// Send log to backend
async function sendRenderLoopLog(log: RenderLog) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/functions/v1/log-render-loop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify(log),
    });
  } catch (e) {
    // Silent fail - don't cause more issues
  }
}

export function useRenderTracker(componentName: string) {
  const renderCountRef = useRef(0);
  const lastLogTimeRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const tracking = renderCounts.get(componentName) || { count: 0, firstRender: now };
    
    // Reset if outside time window
    if (now - tracking.firstRender > TIME_WINDOW_MS) {
      tracking.count = 0;
      tracking.firstRender = now;
    }
    
    tracking.count++;
    renderCounts.set(componentName, tracking);
    renderCountRef.current++;

    // Log if threshold exceeded and not logged recently
    if (tracking.count >= RENDER_THRESHOLD && now - lastLogTimeRef.current > 5000) {
      lastLogTimeRef.current = now;
      
      const log: RenderLog = {
        component: componentName,
        renderCount: tracking.count,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack,
      };

      // Console log with warning
      console.warn(
        `🔴 RENDER LOOP DETECTED: ${componentName}`,
        `\n  Renders: ${tracking.count} in ${TIME_WINDOW_MS}ms`,
        `\n  Total renders: ${renderCountRef.current}`,
        `\n  Stack:`, log.stackTrace
      );

      // Send to backend
      sendRenderLoopLog(log);
    }
  });

  return renderCountRef.current;
}

// Global function to get current render stats
export function getRenderStats() {
  const stats: Record<string, { count: number; windowStart: number }> = {};
  renderCounts.forEach((value, key) => {
    stats[key] = { count: value.count, windowStart: value.firstRender };
  });
  return stats;
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__getRenderStats = getRenderStats;
}
