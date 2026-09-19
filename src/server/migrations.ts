import type { Client } from '@libsql/client';

/**
 * Versioned, ordered schema migrations.
 *
 * This replaces the previous approach where the schema was (re)created on every
 * cold start via CREATE TABLE IF NOT EXISTS plus silent try/catch ALTERs. That
 * pattern was hard to reason about and required manually ALTERing production
 * whenever a column was added.
 *
 * How it works:
 * - A `schema_migrations` table records which migration ids have run.
 * - `migrations` is an append-only, ordered list. Add new schema changes as new
 *   entries; never edit or reorder already-shipped ones.
 * - `runMigrations` applies only the pending migrations, in order, and records
 *   each one. It is safe to run repeatedly (idempotent) and safe against
 *   databases that already contain the schema (migration 001 uses IF NOT EXISTS
 *   and column-existence guards).
 */

interface Migration {
  id: string;
  /** SQL statements applied in order for this migration. */
  statements: string[];
}

/**
 * Add a column only if it does not already exist. libSQL/SQLite has no
 * "ADD COLUMN IF NOT EXISTS", so we inspect the table first. Returns the SQL
 * to run, or null when the column is already present.
 */
const addColumnIfMissing = async (
  client: Client,
  table: string,
  column: string,
  type: string
): Promise<void> => {
  const info = await client.execute(`PRAGMA table_info(${table});`);
  const exists = info.rows.some((row) => (row as any).name === column);
  if (!exists) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
};

/**
 * Migration 001 captures the full current schema. It is written so that a
 * database created by the old initDb() (which already has every table/column)
 * can be marked as applied without error.
 */
const migration001: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    googleId TEXT UNIQUE,
    firstName TEXT,
    lastName TEXT,
    username TEXT UNIQUE,
    preferredCurrency TEXT DEFAULT 'USD',
    companyName TEXT,
    companyEmail TEXT,
    companyPhone TEXT,
    companyAddress TEXT,
    bankAddress TEXT,
    companyLogo TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    invoiceNumber TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    data TEXT NOT NULL,
    layout TEXT NOT NULL,
    settings TEXT NOT NULL,
    publishedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    resetAt INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS invoices_user_updated_idx ON invoices(userId, updatedAt DESC);`,
  `CREATE INDEX IF NOT EXISTS clients_user_name_idx ON clients(userId, name COLLATE NOCASE);`,
  `CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits(resetAt);`,
  // NOTE: the unique index on invoices(userId, invoiceNumber) is created after
  // column reconciliation in runMigrations, because a legacy database may not
  // yet have the invoiceNumber column when this migration first runs.
];

/**
 * Migration 002: content-addressed image store for logo deduplication.
 * Images are stored once per (userId, hash); invoices and profiles reference
 * them by id instead of embedding the base64 data repeatedly.
 */
const migration002: string[] = [
  `CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    hash TEXT NOT NULL,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS images_user_hash_idx ON images(userId, hash);`,
  `CREATE INDEX IF NOT EXISTS images_user_idx ON images(userId);`,
];

const migrations: Migration[] = [
  { id: '001_initial_schema', statements: migration001 },
  { id: '002_images', statements: migration002 },
  // Future migrations go here, e.g.:
  // { id: '003_add_something', statements: [`ALTER TABLE ...`] },
];

const ensureMigrationsTable = async (client: Client) => {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const getAppliedIds = async (client: Client): Promise<Set<string>> => {
  const res = await client.execute('SELECT id FROM schema_migrations;');
  return new Set(res.rows.map((row) => String((row as any).id)));
};

/**
 * Apply all pending migrations in order. Also reconciles the columns that were
 * historically added via ad-hoc ALTERs, so databases created before this
 * migration system converge to the same schema.
 */
export const runMigrations = async (client: Client): Promise<string[]> => {
  await ensureMigrationsTable(client);
  const applied = await getAppliedIds(client);
  const ran: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    for (const statement of migration.statements) {
      await client.execute(statement);
    }

    // Reconcile columns that may be missing on databases predating this system,
    // then create indexes that depend on those columns.
    if (migration.id === '001_initial_schema') {
      await addColumnIfMissing(client, 'users', 'companyName', 'TEXT');
      await addColumnIfMissing(client, 'users', 'companyEmail', 'TEXT');
      await addColumnIfMissing(client, 'users', 'companyPhone', 'TEXT');
      await addColumnIfMissing(client, 'users', 'companyAddress', 'TEXT');
      await addColumnIfMissing(client, 'users', 'bankAddress', 'TEXT');
      await addColumnIfMissing(client, 'users', 'companyLogo', 'TEXT');
      await addColumnIfMissing(client, 'invoices', 'invoiceNumber', 'TEXT');
      await addColumnIfMissing(client, 'invoices', 'status', "TEXT NOT NULL DEFAULT 'draft'");
      await addColumnIfMissing(client, 'invoices', 'publishedAt', 'DATETIME');

      // Depends on invoices.invoiceNumber existing (reconciled just above).
      await client.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_idx ON invoices(userId, invoiceNumber) WHERE invoiceNumber IS NOT NULL;'
      );
    }

    await client.execute({
      sql: 'INSERT INTO schema_migrations (id) VALUES (?);',
      args: [migration.id],
    });
    ran.push(migration.id);
  }

  return ran;
};
