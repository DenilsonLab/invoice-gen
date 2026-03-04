import express from 'express';
import db from '../db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

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
router.get('/', authenticate, (req: any, res: any) => {
  const userId = req.user.id;
  try {
    const invoices = db.prepare('SELECT * FROM invoices WHERE userId = ? ORDER BY updatedAt DESC').all(userId);
    res.json(invoices.map((inv: any) => ({
      ...inv,
      data: JSON.parse(inv.data),
      layout: JSON.parse(inv.layout),
      settings: JSON.parse(inv.settings)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single invoice
router.get('/:id', authenticate, (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND userId = ?').get(invoiceId, userId) as any;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    res.json({
      ...invoice,
      data: JSON.parse(invoice.data),
      layout: JSON.parse(invoice.layout),
      settings: JSON.parse(invoice.settings)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new invoice
router.post('/', authenticate, (req: any, res: any) => {
  const userId = req.user.id;
  const { title, data, layout, settings } = req.body;
  const id = uuidv4();

  try {
    db.prepare(`
      INSERT INTO invoices (id, userId, title, data, layout, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, title, JSON.stringify(data), JSON.stringify(layout), JSON.stringify(settings));

    res.json({ id, title, data, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update invoice
router.put('/:id', authenticate, (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;
  const { title, data, layout, settings } = req.body;

  try {
    const info = db.prepare(`
      UPDATE invoices 
      SET title = ?, data = ?, layout = ?, settings = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND userId = ?
    `).run(title, JSON.stringify(data), JSON.stringify(layout), JSON.stringify(settings), invoiceId, userId);

    if (info.changes === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });
    
    res.json({ id: invoiceId, title, data, layout, settings });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete invoice
router.delete('/:id', authenticate, (req: any, res: any) => {
  const userId = req.user.id;
  const invoiceId = req.params.id;

  try {
    const info = db.prepare('DELETE FROM invoices WHERE id = ? AND userId = ?').run(invoiceId, userId);
    if (info.changes === 0) return res.status(404).json({ error: 'Invoice not found or unauthorized' });
    
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
