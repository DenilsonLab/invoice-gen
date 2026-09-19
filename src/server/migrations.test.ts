import { describe, it, expect } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { runMigrations } from './migrations.js';

const tableExists = async (db: Client, name: string) => {
  const r = await db.execute({ sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?", args: [name] });
  return r.rows.length > 0;
};

const columns = async (db: Client, table: string) => {
  const r = await db.execute(`PRAGMA table_info(${table})`);
  return r.rows.map((row) => String((row as any).name));
};

describe('runMigrations', () => {
  it('creates the full schema on a fresh database and is idempotent', async () => {
    const db = createClient({ url: ':memory:' });

    const firstRun = await runMigrations(db);
    expect(firstRun).toEqual(['001_initial_schema', '002_images']);

    const secondRun = await runMigrations(db);
    expect(secondRun).toEqual([]);

    expect(await tableExists(db, 'users')).toBe(true);
    expect(await tableExists(db, 'invoices')).toBe(true);
    expect(await tableExists(db, 'clients')).toBe(true);
    expect(await tableExists(db, 'rate_limits')).toBe(true);
    expect(await tableExists(db, 'images')).toBe(true);
    expect(await tableExists(db, 'schema_migrations')).toBe(true);
    expect(await columns(db, 'users')).toContain('companyLogo');
    expect(await columns(db, 'images')).toEqual(
      expect.arrayContaining(['id', 'userId', 'hash', 'mime', 'data'])
    );
  });

  it('reconciles a legacy database without dropping existing data', async () => {
    const db = createClient({ url: ':memory:' });

    // Simulate an old database: users without companyLogo, invoices without the
    // newer columns, and no rate_limits / schema_migrations tables.
    await db.executeMultiple(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT, googleId TEXT UNIQUE,
        firstName TEXT, lastName TEXT, username TEXT UNIQUE, preferredCurrency TEXT DEFAULT 'USD',
        companyName TEXT, companyEmail TEXT, companyPhone TEXT, companyAddress TEXT, bankAddress TEXT
      );
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT NOT NULL,
        data TEXT NOT NULL, layout TEXT NOT NULL, settings TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE clients (
        id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL,
        email TEXT, phone TEXT, address TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.execute({ sql: 'INSERT INTO users (id, email) VALUES (?, ?)', args: ['u1', 'legacy@example.com'] });

    const applied = await runMigrations(db);
    expect(applied).toEqual(['001_initial_schema', '002_images']);

    // New columns added.
    expect(await columns(db, 'users')).toContain('companyLogo');
    const invCols = await columns(db, 'invoices');
    expect(invCols).toContain('invoiceNumber');
    expect(invCols).toContain('status');
    expect(invCols).toContain('publishedAt');

    // New table created.
    expect(await tableExists(db, 'rate_limits')).toBe(true);

    // Existing data preserved.
    const users = await db.execute('SELECT id, email FROM users');
    expect(users.rows.length).toBe(1);
    expect(String((users.rows[0] as any).email)).toBe('legacy@example.com');

    // Running again is a no-op.
    expect(await runMigrations(db)).toEqual([]);
  });
});
