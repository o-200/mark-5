import { pino, stdSerializers, Logger } from 'pino';

const isDev = process.env['NODE_ENV'] !== 'production';
const level = process.env['LOG_LEVEL'] || (isDev ? 'debug' : 'info');

export const rootLogger: Logger = pino({
  level,
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: stdSerializers.err,
    error: stdSerializers.err,
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export function createScopedLogger(context: string): Logger {
  return rootLogger.child({ context });
}

export type ScopedLogger = Logger;
