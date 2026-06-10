import express from 'express';
import db from '../db.js';
import jwt from 'jsonwebtoken';
import { parseBody, passwordSchema, profileSchema } from '../validation.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'super-secret-key-for-dev');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit = (name: string, maxAttempts: number, windowMs: number) => (req: any, res: any, next: any) => {
  const now = Date.now();
  const key = `${name}:${req.ip}:${req.user?.id || ''}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (bucket.count >= maxAttempts) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  bucket.count += 1;
  next();
};

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

// Update profile
router.put('/profile', authenticate, async (req: any, res: any) => {
  const parsed = parseBody(profileSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress } = parsed.data;
  const userId = req.user.id;

  try {
    // Check if username is taken by another user
    const resUsername = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? AND id != ?', args: [username, userId] });
    const existingUsername = resUsername.rows[0];
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    await db.execute({
      sql: `
        UPDATE users 
        SET firstName = ?, lastName = ?, username = ?, preferredCurrency = ?, companyName = ?, companyEmail = ?, companyPhone = ?, companyAddress = ?, bankAddress = ?
        WHERE id = ?
      `,
      args: [firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, userId]
    });

    const resUser = await db.execute({
      sql: 'SELECT id, email, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress FROM users WHERE id = ?',
      args: [userId]
    });
    const user = resUser.rows[0];
    res.json(Object.assign({}, user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/password', authenticate, rateLimit('password', 5, 15 * 60 * 1000), async (req: any, res: any) => {
  const parsed = parseBody(passwordSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { currentPassword, newPassword } = parsed.data;
  const userId = req.user.id;

  try {
    const resDb = await db.execute({ sql: 'SELECT password FROM users WHERE id = ?', args: [userId] });
    const user = resDb.rows[0] as any;
    if (!user || !user.password) {
      return res.status(400).json({ error: 'El usuario no tiene una contraseña configurada (posiblemente inició sesión con Google)' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hashedPassword, userId] });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
