import { createClient } from '@libsql/client';

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

// Create tables logic (async wrapper since @libsql/client is async)
async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
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
      bankAddress TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      invoiceNumber TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      data TEXT NOT NULL, -- JSON string of InvoiceData
      layout TEXT NOT NULL, -- JSON string of InvoiceBlock[]
      settings TEXT NOT NULL, -- JSON string of InvoiceSettings
      publishedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS invoices_user_updated_idx ON invoices(userId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS clients_user_name_idx ON clients(userId, name COLLATE NOCASE);
  `);

  // We can safely try/catch alter tables for local db evolution 
  const algunCol = ['companyName', 'companyEmail', 'companyPhone', 'companyAddress', 'bankAddress'];
  for (const col of algunCol) {
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN ${col} TEXT;`);
    } catch (e) { /* ignore if already exists */ }
  }

  const invoiceCols = [
    ['invoiceNumber', 'TEXT'],
    ['status', "TEXT NOT NULL DEFAULT 'draft'"],
    ['publishedAt', 'DATETIME'],
  ];
  for (const [col, type] of invoiceCols) {
    try {
      await db.execute(`ALTER TABLE invoices ADD COLUMN ${col} ${type};`);
    } catch (e) { /* ignore if already exists */ }
  }

  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_invoice_number_idx ON invoices(userId, invoiceNumber) WHERE invoiceNumber IS NOT NULL;');
}

// In serverless environments, running this on cold start is acceptable for low-traffic endpoints
initDb().catch(console.error);

export default db;
