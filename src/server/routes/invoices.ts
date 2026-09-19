import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { invoicePayloadSchema, parseBody, publicInvoiceParamsSchema } from '../validation.js';
import { logError } from '../logger.js';
import { authenticate, type AuthedRequest } from '../middleware/auth.js';
import { storeImage, resolveImageRef } from '../images.js';

const router = express.Router();

const sanitizeSegment = (value: string) => encodeURIComponent(
  value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'user'
);

const buildPublicUrl = (username: string, invoiceId: string) => `/${sanitizeSegment(username)}/${encodeURIComponent(invoiceId)}`;

const toInvoiceResponse = async (inv: any, username?: string) => {
  const status = (inv.status || 'draft') as 'draft' | 'published';
  const settings = JSON.parse(inv.settings as string);

  // Rehydrate a stored-image logo reference back to a data URI so the client,
  // PDF and DOCX keep receiving an inline logo unchanged. Scoped to the owner.
  if (settings && typeof settings.logoUrl === 'string') {
    settings.logoUrl = await resolveImageRef(inv.userId as string, settings.logoUrl);
  }

  return {
    ...inv,
    status,
    publicUrl: status === 'published' && username ? buildPublicUrl(username, inv.id as string) : null,
    data: JSON.parse(inv.data as string),
    layout: JSON.parse(inv.layout as string),
    settings,
  };
};

/**
 * Persist the invoice's logo (if it's an inline data URI) into the image store
 * and return a settings object whose logoUrl is a short reference. Idempotent
 * for values that are already references.
 */
const dedupeSettingsLogo = async (userId: string, settings: any) => {
  if (settings && typeof settings.logoUrl === 'string' && settings.logoUrl) {
    const ref = await storeImage(userId, settings.logoUrl);
    return { ...settings, logoUrl: ref ?? settings.logoUrl };
  }
  return settings;
};

const getNextInvoiceNumber = async (userId: string, requested?: string, excludeId?: string) => {
  const requestedNumber = requested?.trim();
  if (requestedNumber) {
    const existing = await db.execute({
      sql: `SELECT id FROM invoices WHERE userId = ? AND invoiceNumber = ?${excludeId ? ' AND id != ?' : ''}`,
      args: excludeId ? [userId, requestedNumber, excludeId] : [userId, requestedNumber],
    });
    if (!existing.rows[0]) return requestedNumber;
  }

  const resDb = await db.execute({
    sql: 'SELECT invoiceNumber FROM invoices WHERE userId = ? AND invoiceNumber IS NOT NULL ORDER BY createdAt DESC',
    args: [userId],
  });

  let maxNumber = 0;
  let prefix = 'INV-';
  for (const row of resDb.rows as any[]) {
    const match = String(row.invoiceNumber || '').match(/^(.*?)(\d+)$/);
    if (!match) continue;
    const value = parseInt(match[2], 10);
    if (value >= maxNumber) {
      prefix = match[1] || 'INV-';
      maxNumber = value;
    }
  }

  return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
};

const getUsername = async (userId: string) => {
  const resUser = await db.execute({ sql: 'SELECT username FROM users WHERE id = ?', args: [userId] });
  return String((resUser.rows[0] as any)?.username || 'user');
};

// Get all invoices for user
router.get('/', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  try {
    const username = await getUsername(userId);
    const resDb = await db.execute({ sql: 'SELECT * FROM invoices WHERE userId = ? ORDER BY updatedAt DESC', args: [userId] });
    const invoices = resDb.rows;
    res.json(await Promise.all(invoices.map((inv: any) => toInvoiceResponse(inv, username))));
  } catch (error) {
    logError('GET /api/invoices', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/next-number', authenticate, async (req: AuthedRequest, res) => {
  try {
    const invoiceNumber = await getNextInvoiceNumber(req.user.id);
    res.json({ invoiceNumber });
  } catch (error) {
    logError('GET /api/invoices/next-number', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/public/:username/:id', async (req, res) => {
  const parsed = publicInvoiceParamsSchema.safeParse(req.params);
  if (!parsed.success) return res.status(404).json({ error: 'Invoice not found' });

  const { username, id } = parsed.data;
  try {
    const resDb = await db.execute({
      sql: `
        SELECT invoices.*, users.username
        FROM invoices
        INNER JOIN users ON users.id = invoices.userId
        WHERE invoices.id = ? AND invoices.status = 'published'
      `,
      args: [id],
    });
    const invoice = resDb.rows[0] as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (sanitizeSegment(String(invoice.username || 'user')) !== encodeURIComponent(username)) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(await toInvoiceResponse(invoice, String(invoice.username || username)));
  } catch (error) {
    logError('GET /api/invoices/public/:username/:id', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single invoice
router.get('/:id', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  try {
    const resDb = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ? AND userId = ?', args: [invoiceId, userId] });
    const invoice = resDb.rows[0] as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const username = await getUsername(userId);
    res.json(await toInvoiceResponse(invoice, username));
  } catch (error) {
    logError('GET /api/invoices/:id', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/draft', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;
  const id = uuidv4();

  try {
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber);
    const reservedData = { ...data, invoiceNumber };
    const storedSettings = await dedupeSettingsLogo(userId, settings);
    await db.execute({
      sql: `
        INSERT INTO invoices (id, userId, title, invoiceNumber, status, data, layout, settings)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)
      `,
      args: [id, userId, title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(storedSettings)]
    });

    res.json({ id, title, invoiceNumber, status: 'draft', publicUrl: null, data: reservedData, layout, settings });
  } catch (error) {
    logError('POST /api/invoices/draft', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/draft', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;

  try {
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber, invoiceId);
    const reservedData = { ...data, invoiceNumber };
    const storedSettings = await dedupeSettingsLogo(userId, settings);
    const info = await db.execute({
      sql: `
        UPDATE invoices 
        SET title = ?, invoiceNumber = ?, data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ? AND status = 'draft'
      `,
      args: [title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(storedSettings), invoiceId, userId]
    });

    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Draft not found or already published' });

    res.json({ id: invoiceId, title, invoiceNumber, status: 'draft', publicUrl: null, data: reservedData, layout, settings });
  } catch (error) {
    logError('PUT /api/invoices/:id/draft', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/publish', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;
  const id = uuidv4();

  try {
    const username = await getUsername(userId);
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber);
    const reservedData = { ...data, invoiceNumber };
    const storedSettings = await dedupeSettingsLogo(userId, settings);
    await db.execute({
      sql: `
        INSERT INTO invoices (id, userId, title, invoiceNumber, status, publishedAt, data, layout, settings)
        VALUES (?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, ?, ?, ?)
      `,
      args: [id, userId, title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(storedSettings)]
    });

    res.json({ id, title, invoiceNumber, status: 'published', publicUrl: buildPublicUrl(username, id), data: reservedData, layout, settings });
  } catch (error) {
    logError('POST /api/invoices/publish', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/publish', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;

  try {
    const username = await getUsername(userId);
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber, invoiceId);
    const reservedData = { ...data, invoiceNumber };
    const storedSettings = await dedupeSettingsLogo(userId, settings);
    const info = await db.execute({
      sql: `
        UPDATE invoices 
        SET title = ?, invoiceNumber = ?, status = 'published', publishedAt = COALESCE(publishedAt, CURRENT_TIMESTAMP), data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?
      `,
      args: [title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(storedSettings), invoiceId, userId]
    });

    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    res.json({ id: invoiceId, title, invoiceNumber, status: 'published', publicUrl: buildPublicUrl(username, invoiceId), data: reservedData, layout, settings });
  } catch (error) {
    logError('PUT /api/invoices/:id/publish', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticate, async (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;

  try {
    const info = await db.execute({ sql: 'DELETE FROM invoices WHERE id = ? AND userId = ?', args: [invoiceId, userId] });
    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    logError('DELETE /api/invoices/:id', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
