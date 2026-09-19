import express from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { clientSchema, parseBody } from '../validation.js';
import { logError } from '../logger.js';
import { authenticate, type AuthedRequest } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req: AuthedRequest, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, phone, address, createdAt, updatedAt FROM clients WHERE userId = ? ORDER BY name COLLATE NOCASE ASC',
      args: [req.user.id],
    });

    res.json(result.rows.map((row) => Object.assign({}, row)));
  } catch (error) {
    logError('GET /api/clients', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req: AuthedRequest, res) => {
  const parsed = parseBody(clientSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const id = randomUUID();
  const { name, email, phone, address } = parsed.data;

  try {
    await db.execute({
      sql: 'INSERT INTO clients (id, userId, name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, req.user.id, name, email, phone, address],
    });

    const result = await db.execute({
      sql: 'SELECT id, name, email, phone, address, createdAt, updatedAt FROM clients WHERE id = ? AND userId = ?',
      args: [id, req.user.id],
    });

    res.status(201).json(Object.assign({}, result.rows[0]));
  } catch (error) {
    logError('POST /api/clients', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req: AuthedRequest, res) => {
  const parsed = parseBody(clientSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { name, email, phone, address } = parsed.data;

  try {
    const existing = await db.execute({ sql: 'SELECT id FROM clients WHERE id = ? AND userId = ?', args: [req.params.id, req.user.id] });
    if (!existing.rows[0]) return res.status(404).json({ error: 'Client not found' });

    await db.execute({
      sql: 'UPDATE clients SET name = ?, email = ?, phone = ?, address = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?',
      args: [name, email, phone, address, req.params.id, req.user.id],
    });

    const result = await db.execute({
      sql: 'SELECT id, name, email, phone, address, createdAt, updatedAt FROM clients WHERE id = ? AND userId = ?',
      args: [req.params.id, req.user.id],
    });

    res.json(Object.assign({}, result.rows[0]));
  } catch (error) {
    logError('PUT /api/clients/:id', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthedRequest, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM clients WHERE id = ? AND userId = ?', args: [req.params.id, req.user.id] });
    res.json({ ok: true });
  } catch (error) {
    logError('DELETE /api/clients/:id', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
