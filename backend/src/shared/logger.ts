import { pino } from 'pino';
import { env } from '../config/env.js';

/** Structured app-wide logger. Silent in tests; request logging is wired by
 *  pino-http in app.ts with a request id per request. */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: null, // no pid/hostname noise; the platform adds those.
});
