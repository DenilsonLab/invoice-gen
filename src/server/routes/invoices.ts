import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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

// Get all invoices for user
router.get('/', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  try {
    const resDb = await db.execute({ sql: 'SELECT * FROM invoices WHERE userId = ? ORDER BY updatedAt DESC', args: [userId] });
    const invoices = resDb.rows;
    res.json(invoices.map((inv: any) => ({
      ...inv,
      data: JSON.parse(inv.data as string),
      layout: JSON.parse(inv.layout as string),
      settings: JSON.parse(inv.settings as string)
    })));
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

    res.json({
      ...invoice,
      // Create new object to avoid sending the unparsed JSON strings along with parsed object properties
      data: JSON.parse(invoice.data as string),
      layout: JSON.parse(invoice.layout as string),
      settings: JSON.parse(invoice.settings as string)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new invoice
router.post('/', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const { title, data, layout, settings } = req.body;
  const id = uuidv4();

  try {
    await db.execute({
      sql: `
        INSERT INTO invoices (id, userId, title, data, layout, settings)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, title, JSON.stringify(data), JSON.stringify(layout), JSON.stringify(settings)]
    });

    res.json({ id, title, data, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice
router.put('/:id', authenticate, async (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const { title, data, layout, settings } = req.body;

  try {
    const info = await db.execute({
      sql: `
        UPDATE invoices 
        SET title = ?, data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?
      `,
      args: [title, JSON.stringify(data), JSON.stringify(layout), JSON.stringify(settings), invoiceId, userId]
    });

    if (info.rowsAffected === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    res.json({ id: invoiceId, title, data, layout, settings });
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
