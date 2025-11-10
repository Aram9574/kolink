/**
 * Centralized Logger for Kolink
 * Replaces console.log/info with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  debug(message: string, context?: LogContext | unknown) {
    if (this.isDevelopment && !this.isTest) {
      const safeContext = this.normalizeContext(context);
      this.log('debug', message, safeContext);
    }
  }

  info(message: string, context?: LogContext | unknown) {
    const safeContext = this.normalizeContext(context);
    this.log('info', message, safeContext);
  }

  warn(message: string, context?: LogContext | unknown) {
    const safeContext = this.normalizeContext(context);
    this.log('warn', message, safeContext);
  }

  private normalizeContext(context?: LogContext | unknown): LogContext | undefined {
    if (!context) return undefined;

    // If it's already a plain object (not Error, not primitive), use as-is
    if (typeof context === 'object' &&
        !('stack' in context) &&
        !('message' in context) &&
        !(context instanceof Error)) {
      return context as LogContext;
    }

    // Otherwise wrap in data field
    return { data: context };
  }

  error(message: string, errorOrContext?: Error | unknown | LogContext, context?: LogContext) {
    // Handle different signatures for backwards compatibility
    let finalError: Error | unknown | undefined;
    let finalContext: LogContext | undefined = context;

    // If second arg looks like context object (has no stack/message properties typical of errors)
    if (errorOrContext && typeof errorOrContext === 'object' &&
        !('stack' in errorOrContext) && !('message' in errorOrContext) &&
        !(errorOrContext instanceof Error)) {
      finalContext = { ...finalContext, ...errorOrContext };
      finalError = undefined;
    } else {
      finalError = errorOrContext;
    }

    const errorContext = {
      ...finalContext,
      ...(finalError ? {
        error: finalError instanceof Error ? {
          name: finalError.name,
          message: finalError.message,
          stack: finalError.stack,
        } : finalError,
      } : {}),
    };

    this.log('error', message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();

    if (this.isDevelopment && !this.isTest) {
      const prefix = this.getPrefix(level);
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](
        `${prefix} [${timestamp}] ${message}`,
        context || ''
      );
      return;
    }

    // Production: structured JSON logging
    const logEntry = { timestamp, level, message, ...context };
    // eslint-disable-next-line no-console
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify(logEntry));
    }
  }

  private getPrefix(level: LogLevel): string {
    const prefixes = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };
    return prefixes[level] || '📝';
  }

  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.debug(`API Request: ${method} ${endpoint}`, context);
  }

  apiResponse(method: string, endpoint: string, status: number, duration?: number) {
    const message = `API Response: ${method} ${endpoint} - ${status}`;
    const context = duration ? { duration: `${duration}ms` } : undefined;
    
    if (status >= 500) {
      this.error(message, undefined, context);
    } else if (status >= 400) {
      this.warn(message, context);
    } else {
      this.debug(message, context);
    }
  }
}

export const logger = new Logger();
export type { LogContext };
