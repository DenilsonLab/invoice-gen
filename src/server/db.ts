import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const db = new Database(path.join(__dirname, '../../database.sqlite'));

// Create tables
db.exec(`
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

// Add new columns if they don't exist
try { db.exec(`ALTER TABLE users ADD COLUMN companyName TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN companyEmail TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN companyPhone TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN companyAddress TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN bankAddress TEXT;`); } catch (e) {}

export default db;
