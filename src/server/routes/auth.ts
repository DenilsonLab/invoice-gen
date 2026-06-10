import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { loginSchema, parseBody, registerSchema } from '../validation.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'super-secret-key-for-dev');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

const oauthStateCookieOptions = {
  ...authCookieOptions,
  maxAge: 10 * 60 * 1000,
};

const getAppUrl = () => {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is required for Google OAuth');
  return appUrl.replace(/\/$/, '');
};

const createUsernameFromEmail = (email: string) => {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'user';
  return `${base}${Math.floor(Math.random() * 1000)}`;
};

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit = (name: string, maxAttempts: number, windowMs: number) => (req: any, res: any, next: any) => {
  const now = Date.now();
  const key = `${name}:${req.ip}:${req.body?.email || ''}`;
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

// Register
router.post('/register', rateLimit('register', 5, 15 * 60 * 1000), async (req, res) => {
  const parsed = parseBody(registerSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { email, password, firstName, lastName } = parsed.data;
  try {
    const resDb = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const existingUser = resDb.rows[0];
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const username = createUsernameFromEmail(email);

    await db.execute({
      sql: `
        INSERT INTO users (id, email, password, firstName, lastName, username)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, email, hashedPassword, firstName, lastName, username]
    });

    const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, authCookieOptions);
    res.json({ id, email, firstName, lastName, username });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', rateLimit('login', 10, 15 * 60 * 1000), async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const { email, password } = parsed.data;
  try {
    const resDb = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
    const user = resDb.rows[0] as any;
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, authCookieOptions);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      preferredCurrency: user.preferredCurrency,
      companyName: user.companyName,
      companyEmail: user.companyEmail,
      companyPhone: user.companyPhone,
      companyAddress: user.companyAddress,
      bankAddress: user.bankAddress
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', authCookieOptions);
  res.json({ message: 'Logged out' });
});

// Me (Get current user)
router.get('/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const resDb = await db.execute({
      sql: 'SELECT id, email, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress FROM users WHERE id = ?',
      args: [decoded.id]
    });
    const user = resDb.rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    // ensure standard object without complex libsql wrappers
    res.json(Object.assign({}, user));
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Google Auth URL (Popup flow)
router.get('/google/url', (req, res) => {
  const appUrl = getAppUrl();
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const state = randomBytes(32).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  res.cookie('oauth_state', state, oauthStateCookieOptions);
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

// Google Callback
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const appUrl = getAppUrl();
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    if (!code || state !== req.cookies.oauth_state) {
      return res.status(400).send('Invalid OAuth state');
    }

    res.clearCookie('oauth_state', authCookieOptions);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      })
    });

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();

    // Check if user exists
    const resDb = await db.execute({
      sql: 'SELECT * FROM users WHERE googleId = ? OR email = ?',
      args: [userData.id, userData.email]
    });
    let user = resDb.rows[0] as any;

    if (!user) {
      // Create new user
      const id = uuidv4();
      const username = createUsernameFromEmail(userData.email);

      await db.execute({
        sql: `
          INSERT INTO users (id, email, googleId, firstName, lastName, username)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [id, userData.email, userData.id, userData.given_name, userData.family_name, username]
      });

      user = { id, email: userData.email, firstName: userData.given_name, lastName: userData.family_name, username };
    } else if (!user.googleId) {
      // Link google account to existing email
      await db.execute({
        sql: 'UPDATE users SET googleId = ? WHERE id = ?',
        args: [userData.id, user.id as string]
      });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, authCookieOptions);

    // Send success message to parent window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '${appUrl}');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

export default router;
