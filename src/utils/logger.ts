type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Level[] = ['debug', 'info', 'warn', 'error'];
const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as Level;
const thresholdIndex = LEVEL_ORDER.indexOf(envLevel) >= 0 ? LEVEL_ORDER.indexOf(envLevel) : 1;

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER.indexOf(level) >= thresholdIndex;
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta ?? '');
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
