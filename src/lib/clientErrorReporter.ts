// Lightweight global client error reporter that logs to console and backend.
// Keeps app behavior unchanged while giving us diagnostics for production-only crashes.
// v1.1: Added debounce/throttle for repeated identical errors

import { checkErrorThrottle, markErrorLogged } from '@/lib/analytics/core/errorThrottle';

type ClientErrorPayload = {
  kind: 'error' | 'unhandledrejection';
  message: string;
  name?: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  href?: string;
  userAgent?: string;
  timestamp: string;
  duplicateCount?: number;
};

const LAST_SEND_KEY = '__lastClientErrorSentAt';

async function sendToBackend(payload: ClientErrorPayload) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !apikey) return;

  await fetch(`${baseUrl}/functions/v1/log-client-error`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey,
    },
    body: JSON.stringify(payload),
  });
}

function shouldThrottleGlobal(now: number) {
  try {
    const last = Number(sessionStorage.getItem(LAST_SEND_KEY) || '0');
    if (now - last < 10_000) return true; // max 1 event / 10s
    sessionStorage.setItem(LAST_SEND_KEY, String(now));
    return false;
  } catch {
    return false;
  }
}

export function initClientErrorReporter() {
  if (typeof window === 'undefined') return;
  // Prevent double-registration (e.g., HMR)
  const w = window as any;
  if (w.__clientErrorReporterInitialized) return;
  w.__clientErrorReporterInitialized = true;

  window.addEventListener('error', (event) => {
    const now = Date.now();
    if (shouldThrottleGlobal(now)) return;

    const err = event.error as Error | undefined;
    const message = err?.message || event.message || 'Unknown error';
    const screen = window.location.pathname;
    
    // Check per-error throttle (same message+screen within 60s)
    const throttleCheck = checkErrorThrottle(message, screen);
    if (!throttleCheck.shouldLog) {
      // Still log to console in dev for debugging
      if (import.meta.env.DEV) {
        console.debug(`[client-error] Throttled duplicate #${throttleCheck.duplicateCount}:`, message.substring(0, 100));
      }
      return;
    }
    
    const payload: ClientErrorPayload = {
      kind: 'error',
      message,
      name: err?.name,
      stack: err?.stack,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      href: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      duplicateCount: throttleCheck.duplicateCount,
    };

    // Console for local debugging
    // eslint-disable-next-line no-console
    console.error('[client-error]', payload);

    // Mark as logged and send to backend
    markErrorLogged(throttleCheck.throttleKey);
    void sendToBackend(payload);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const now = Date.now();
    if (shouldThrottleGlobal(now)) return;

    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';

    const screen = window.location.pathname;
    
    // Check per-error throttle
    const throttleCheck = checkErrorThrottle(message, screen);
    if (!throttleCheck.shouldLog) {
      if (import.meta.env.DEV) {
        console.debug(`[client-rejection] Throttled duplicate #${throttleCheck.duplicateCount}:`, message.substring(0, 100));
      }
      return;
    }

    const payload: ClientErrorPayload = {
      kind: 'unhandledrejection',
      message,
      name: reason instanceof Error ? reason.name : undefined,
      stack: reason instanceof Error ? reason.stack : undefined,
      href: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      duplicateCount: throttleCheck.duplicateCount,
    };

    // eslint-disable-next-line no-console
    console.error('[client-unhandledrejection]', payload);
    markErrorLogged(throttleCheck.throttleKey);
    void sendToBackend(payload);
  });
}
