import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { parseBody, passwordSchema, profileSchema } from '../validation.js';
import { logError } from '../logger.js';
import { authenticate, type AuthedRequest } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { storeImage, resolveImageRef } from '../images.js';

const router = express.Router();

// Update profile
router.put('/profile', authenticate, async (req: AuthedRequest, res) => {
  const parsed = parseBody(profileSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, companyLogo } = parsed.data;
  const userId = req.user.id;

  try {
    // Check if username is taken by another user
    const resUsername = await db.execute({ sql: 'SELECT id FROM users WHERE username = ? AND id != ?', args: [username, userId] });
    const existingUsername = resUsername.rows[0];
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Deduplicate the logo into the image store; persist only a short reference.
    const logoRef = await storeImage(userId, companyLogo);

    await db.execute({
      sql: `
        UPDATE users 
        SET firstName = ?, lastName = ?, username = ?, preferredCurrency = ?, companyName = ?, companyEmail = ?, companyPhone = ?, companyAddress = ?, bankAddress = ?, companyLogo = ?
        WHERE id = ?
      `,
      args: [firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, logoRef, userId]
    });

    const resUser = await db.execute({
      sql: 'SELECT id, email, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, companyLogo FROM users WHERE id = ?',
      args: [userId]
    });
    const user = Object.assign({}, resUser.rows[0]) as any;
    // Rehydrate the reference back to a data URI for the client.
    user.companyLogo = await resolveImageRef(userId, user.companyLogo);
    res.json(user);
  } catch (error) {
    logError('PUT /api/users/profile', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/password', authenticate, rateLimit('password', 5, 15 * 60 * 1000, (req) => (req as AuthedRequest).user?.id || ''), async (req: AuthedRequest, res) => {
  const parsed = parseBody(passwordSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { currentPassword, newPassword } = parsed.data;
  const userId = req.user.id;

  try {
    const resDb = await db.execute({ sql: 'SELECT password FROM users WHERE id = ?', args: [userId] });
    const user = resDb.rows[0] as any;
    if (!user || !user.password) {
      return res.status(400).json({ error: 'This account has no password set (it may use Google sign-in)' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hashedPassword, userId] });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logError('PUT /api/users/password', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
