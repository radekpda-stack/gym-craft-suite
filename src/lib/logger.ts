/**
 * Conditional logger that only logs in development mode
 * Prevents console pollution in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors, but with less detail in production
    if (isDev) {
      console.error(...args);
    } else {
      // In production, only log the error message, not the full stack
      const message = args[0];
      if (message instanceof Error) {
        console.error(`[Error]: ${message.message}`);
      } else if (typeof message === 'string') {
        console.error(`[Error]: ${message}`);
      }
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  table: (data: unknown) => {
    if (isDev) console.table(data);
  },
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
  time: (label: string) => {
    if (isDev) console.time(label);
  },
  timeEnd: (label: string) => {
    if (isDev) console.timeEnd(label);
  },
};

export default logger;
