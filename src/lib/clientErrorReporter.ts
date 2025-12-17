// Lightweight global client error reporter that logs to console and backend.
// Keeps app behavior unchanged while giving us diagnostics for production-only crashes.

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

function shouldThrottle(now: number) {
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
    if (shouldThrottle(now)) return;

    const err = event.error as Error | undefined;
    const payload: ClientErrorPayload = {
      kind: 'error',
      message: err?.message || event.message || 'Unknown error',
      name: err?.name,
      stack: err?.stack,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      href: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // Console for local debugging
    // eslint-disable-next-line no-console
    console.error('[client-error]', payload);

    // Backend for production-only issues
    void sendToBackend(payload);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const now = Date.now();
    if (shouldThrottle(now)) return;

    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';

    const payload: ClientErrorPayload = {
      kind: 'unhandledrejection',
      message,
      name: reason instanceof Error ? reason.name : undefined,
      stack: reason instanceof Error ? reason.stack : undefined,
      href: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.error('[client-unhandledrejection]', payload);
    void sendToBackend(payload);
  });
}
