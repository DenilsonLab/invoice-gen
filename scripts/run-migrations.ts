import 'dotenv/config';
import { createClient } from '@libsql/client';
import { runMigrations } from '../src/server/migrations.js';

/**
 * Applies pending schema migrations to the configured database.
 * Run from the project root: `npm run migrate`.
 *
 * Uses TURSO_DATABASE_URL/TURSO_AUTH_TOKEN when set, otherwise the local
 * SQLite file (file:database.sqlite), mirroring the app's db.ts resolution.
 */
const url = process.env.TURSO_DATABASE_URL || 'file:database.sqlite';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

runMigrations(client)
  .then((applied) => {
    if (applied.length === 0) {
      console.log('No pending migrations. Schema is up to date.');
    } else {
      console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
