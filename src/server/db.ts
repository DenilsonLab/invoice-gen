import { createClient } from '@libsql/client';
import { runMigrations } from './migrations.js';

// Use production DB if provided, else fall back to local file
const dbUrl = process.env.TURSO_DATABASE_URL || (process.env.NODE_ENV === 'production' ? undefined : 'file:database.sqlite');
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  throw new Error('TURSO_DATABASE_URL is required in production');
}

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Apply pending schema migrations on startup. On serverless this runs on cold
// start; the migration runner is idempotent, so already-applied migrations are
// skipped cheaply.
runMigrations(db).catch((error) => {
  console.error('[error] runMigrations failed:', error);
});

export default db;
