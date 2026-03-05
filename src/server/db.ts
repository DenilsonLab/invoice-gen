import { createClient } from '@libsql/client';

// Use production DB if provided, else fall back to local file
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:database.sqlite';
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

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
      data TEXT NOT NULL, -- JSON string of InvoiceData
      layout TEXT NOT NULL, -- JSON string of InvoiceBlock[]
      settings TEXT NOT NULL, -- JSON string of InvoiceSettings
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // We can safely try/catch alter tables for local db evolution 
  const algunCol = ['companyName', 'companyEmail', 'companyPhone', 'companyAddress', 'bankAddress'];
  for (const col of algunCol) {
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN ${col} TEXT;`);
    } catch (e) { /* ignore if already exists */ }
  }
}

// In serverless environments, running this on cold start is acceptable for low-traffic endpoints
initDb().catch(console.error);

export default db;
