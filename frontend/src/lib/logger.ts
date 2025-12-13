/**
 * Production-safe logger utility
 * Logs only in development, silent in production
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logWithLevel(level: LogLevel, ...args: any[]) {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console[level](...args);
    } else if (level === 'error') {
      // Always log errors, even in production (for monitoring)
      // eslint-disable-next-line no-console
      console.error(...args);
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any[]) {
    this.logWithLevel('log', ...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(...args: any[]) {
    this.logWithLevel('error', ...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(...args: any[]) {
    this.logWithLevel('warn', ...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(...args: any[]) {
    this.logWithLevel('info', ...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(...args: any[]) {
    this.logWithLevel('debug', ...args);
  }

  group(label: string) {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.group(label);
    }
  }

  groupEnd() {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table(data: any) {
    if (this.isDevelopment) {
      // eslint-disable-next-line no-console
      console.table(data);
    }
  }
}

export const logger = new Logger();

// For backward compatibility
export default logger;
