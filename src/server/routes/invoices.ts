import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { invoicePayloadSchema, parseBody, publicInvoiceParamsSchema } from '../validation.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'super-secret-key-for-dev');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

// Middleware to verify token
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const sanitizeSegment = (value: string) => encodeURIComponent(
  value.trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'user'
);

const buildPublicUrl = (username: string, invoiceId: string) => `/${sanitizeSegment(username)}/${encodeURIComponent(invoiceId)}`;

const toInvoiceResponse = (inv: any, username?: string) => {
  const status = (inv.status || 'draft') as 'draft' | 'published';
  return {
    ...inv,
    status,
    publicUrl: status === 'published' && username ? buildPublicUrl(username, inv.id as string) : null,
    data: JSON.parse(inv.data as string),
    layout: JSON.parse(inv.layout as string),
    settings: JSON.parse(inv.settings as string),
  };
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
router.get('/', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  try {
    const username = await getUsername(userId);
    const resDb = await db.execute({ sql: 'SELECT * FROM invoices WHERE userId = ? ORDER BY updatedAt DESC', args: [userId] });
    const invoices = resDb.rows;
    res.json(invoices.map((inv: any) => toInvoiceResponse(inv, username)));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/next-number', authenticate, async (req: any, res: any) => {
  try {
    const invoiceNumber = await getNextInvoiceNumber(req.user.id);
    res.json({ invoiceNumber });
  } catch (error) {
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

    res.json(toInvoiceResponse(invoice, String(invoice.username || username)));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single invoice
router.get('/:id', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  try {
    const resDb = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ? AND userId = ?', args: [invoiceId, userId] });
    const invoice = resDb.rows[0] as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const username = await getUsername(userId);
    res.json(toInvoiceResponse(invoice, username));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/draft', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;
  const id = uuidv4();

  try {
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber);
    const reservedData = { ...data, invoiceNumber };
    await db.execute({
      sql: `
        INSERT INTO invoices (id, userId, title, invoiceNumber, status, data, layout, settings)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, ?)
      `,
      args: [id, userId, title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(settings)]
    });

    res.json({ id, title, invoiceNumber, status: 'draft', publicUrl: null, data: reservedData, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/draft', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;

  try {
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber, invoiceId);
    const reservedData = { ...data, invoiceNumber };
    const info = await db.execute({
      sql: `
        UPDATE invoices 
        SET title = ?, invoiceNumber = ?, data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ? AND status = 'draft'
      `,
      args: [title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(settings), invoiceId, userId]
    });

    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Draft not found or already published' });

    res.json({ id: invoiceId, title, invoiceNumber, status: 'draft', publicUrl: null, data: reservedData, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/publish', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;
  const id = uuidv4();

  try {
    const username = await getUsername(userId);
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber);
    const reservedData = { ...data, invoiceNumber };
    await db.execute({
      sql: `
        INSERT INTO invoices (id, userId, title, invoiceNumber, status, publishedAt, data, layout, settings)
        VALUES (?, ?, ?, ?, 'published', CURRENT_TIMESTAMP, ?, ?, ?)
      `,
      args: [id, userId, title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(settings)]
    });

    res.json({ id, title, invoiceNumber, status: 'published', publicUrl: buildPublicUrl(username, id), data: reservedData, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/publish', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const parsed = parseBody(invoicePayloadSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { title, data, layout, settings } = parsed.data;

  try {
    const username = await getUsername(userId);
    const invoiceNumber = await getNextInvoiceNumber(userId, data.invoiceNumber, invoiceId);
    const reservedData = { ...data, invoiceNumber };
    const info = await db.execute({
      sql: `
        UPDATE invoices 
        SET title = ?, invoiceNumber = ?, status = 'published', publishedAt = COALESCE(publishedAt, CURRENT_TIMESTAMP), data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?
      `,
      args: [title, invoiceNumber, JSON.stringify(reservedData), JSON.stringify(layout), JSON.stringify(settings), invoiceId, userId]
    });

    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    res.json({ id: invoiceId, title, invoiceNumber, status: 'published', publicUrl: buildPublicUrl(username, invoiceId), data: reservedData, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;

  try {
    const info = await db.execute({ sql: 'DELETE FROM invoices WHERE id = ? AND userId = ?', args: [invoiceId, userId] });
    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
