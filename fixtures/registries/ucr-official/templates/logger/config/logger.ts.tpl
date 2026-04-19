export interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function writeLog(level: "info" | "warn" | "error", message: string, context: LogContext = {}): void {
  const payload = {
    level,
    scope: "{{instanceIdKebab}}",
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  console[level](JSON.stringify(payload));
}

export function createLogger(scope = "{{instanceIdKebab}}"): Logger {
  return {
    info(message, context) {
      writeLog("info", `[${scope}] ${message}`, context);
    },
    warn(message, context) {
      writeLog("warn", `[${scope}] ${message}`, context);
    },
    error(message, context) {
      writeLog("error", `[${scope}] ${message}`, context);
    },
  };
}

export const logger = createLogger();
