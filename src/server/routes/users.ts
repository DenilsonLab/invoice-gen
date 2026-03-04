import express from 'express';
import db from '../db';
import jwt from 'jsonwebtoken';

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

// Update profile
router.put('/profile', authenticate, (req: any, res: any) => {
  const { firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress } = req.body;
  const userId = req.user.id;

  try {
    // Check if username is taken by another user
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    db.prepare(`
      UPDATE users 
      SET firstName = ?, lastName = ?, username = ?, preferredCurrency = ?, companyName = ?, companyEmail = ?, companyPhone = ?, companyAddress = ?, bankAddress = ?
      WHERE id = ?
    `).run(firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, userId);

    const user = db.prepare('SELECT id, email, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress FROM users WHERE id = ?').get(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/password', authenticate, async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.password) {
      return res.status(400).json({ error: 'El usuario no tiene una contraseña configurada (posiblemente inició sesión con Google)' });
    }

    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
