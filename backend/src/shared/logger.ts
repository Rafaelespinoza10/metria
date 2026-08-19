import { pino } from 'pino';
import { env } from '../config/env.js';

/** Structured app-wide logger for startup, shutdown, and unhandled errors.
 *  Silent in tests. There is no per-request access log: the platform in front of
 *  the API already records those, and it drowned the dev console. */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  base: null, // no pid/hostname noise; the platform adds those.
});
