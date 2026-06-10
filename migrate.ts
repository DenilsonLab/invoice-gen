import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Client for LOCAL SQLite
const localDb = createClient({ url: 'file:database.sqlite' });

// Client for REMOTE Turso
const remoteUrl = process.env.TURSO_DATABASE_URL;
const remoteToken = process.env.TURSO_AUTH_TOKEN;

if (!remoteUrl || !remoteToken) {
  console.error("Missing TURSO env vars in .env");
  process.exit(1);
}

const remoteDb = createClient({
  url: remoteUrl,
  authToken: remoteToken,
});

async function migrate() {
  console.log("Corrigiendo IDs y reintentando migración de local a Turso...");

  // Get users
  const usersRes = await localDb.execute('SELECT * FROM users');
  const userIdMap = new Map<string, string>();

  for (const row of usersRes.rows) {
    try {
      // Intenta ver si el email ya existe en remoto
      const remoteCheck = await remoteDb.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [row.email]
      });

      if (remoteCheck.rows.length > 0) {
        // El usuario ya existe pero tiene otro ID.
        const remoteId = remoteCheck.rows[0].id as string;
        userIdMap.set(row.id as string, remoteId);
        console.log(`Usuario ${row.email} ya existe. Mapeando su ID local al ID remoto.`);
      } else {
        await remoteDb.execute({
          sql: `INSERT INTO users (id, email, password, googleId, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            row.id, row.email, row.password, row.googleId, row.firstName, row.lastName, row.username,
            row.preferredCurrency || 'USD', row.companyName, row.companyEmail, row.companyPhone, row.companyAddress, row.bankAddress
          ]
        });
        userIdMap.set(row.id as string, row.id as string);
        console.log(`Migrado nuevo usuario ${row.email}`);
      }
    } catch (e: any) {
      console.error(`Error procesando usuario ${row.email}:`, e.message);
    }
  }

  // Get invoices
  const invoicesRes = await localDb.execute('SELECT * FROM invoices');
  console.log(`Encontradas ${invoicesRes.rows.length} facturas locales. Insertando...`);

  let count = 0;
  for (const row of invoicesRes.rows) {
    const remoteUserId = userIdMap.get(row.userId as string);
    if (!remoteUserId) {
      console.error(`No logré mapear el usuario para la factura ${row.title}, saltándola.`);
      continue;
    }

    try {
      await remoteDb.execute({
        sql: `INSERT INTO invoices (id, userId, title, data, layout, settings, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id, remoteUserId, row.title, row.data, row.layout, row.settings, row.createdAt, row.updatedAt
        ]
      });
      console.log(`✅ Migrada factura ${row.title}`);
      count++;
    } catch (e: any) {
      if (e.message.includes('constraint')) {
        console.log(`⚠️ Factura ${row.title} saltada (Probablemente ya subida).`);
      } else {
        console.error(`❌ Error con factura ${row.title}:`, e.message);
      }
    }
  }

  console.log(`¡Listo! Se subieron ${count} facturas correctamente a Turso.`);
  process.exit(0);
}

migrate().catch(err => console.error(err));
