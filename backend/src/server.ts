import { sql } from 'drizzle-orm';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb, getDb } from './database/client.js';
import { logger } from './shared/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Metria API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// The app cannot function without the seeded system rows (measurement types,
// badge definitions) — surface a skipped `db:seed` loudly instead of serving
// empty screens.
void (async () => {
  try {
    const result = await getDb().execute<{ count: number }>(
      sql`select count(*)::int as count from measurement_types`,
    );
    if ((result.rows[0]?.count ?? 0) === 0) {
      logger.error(
        'measurement_types is empty — the database seed has not run. Run `pnpm db:seed`.',
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Startup database check failed');
  }
})();

// Graceful shutdown: stop accepting connections, drain in-flight requests,
// release the pool. A deploy must not drop requests mid-flight.
let shuttingDown = false;
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — draining connections`);
  server.close(() => {
    closeDb()
      .catch((error: unknown) => logger.error({ err: error }, 'Error closing the database pool'))
      .finally(() => process.exit(0));
  });
  // Backstop: never hang a deploy on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
