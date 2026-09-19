import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { googleTokenSchema, googleUserInfoSchema, loginSchema, parseBody, registerSchema } from '../validation.js';
import { logError } from '../logger.js';
import { JWT_SECRET, isProduction } from '../config.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { resolveImageRef } from '../images.js';

const router = express.Router();

// How long the auth session lasts. Kept in sync with the JWT's expiresIn so the
// cookie and the token expire together (previously the cookie had no maxAge, so
// it was a session cookie that died when the browser closed).
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
};

// Options for setting the auth cookie (adds the lifetime). clearCookie uses the
// base options above so the cookie attributes match on removal.
const authCookieSetOptions = {
  ...authCookieOptions,
  maxAge: TOKEN_MAX_AGE_MS,
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
    res.cookie('token', token, authCookieSetOptions);
    res.json({ id, email, firstName, lastName, username });
  } catch (error) {
    logError('POST /api/auth/register', error);
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
    res.cookie('token', token, authCookieSetOptions);
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
      bankAddress: user.bankAddress,
      companyLogo: await resolveImageRef(user.id as string, user.companyLogo as string | null)
    });
  } catch (error) {
    logError('POST /api/auth/login', error);
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
      sql: 'SELECT id, email, firstName, lastName, username, preferredCurrency, companyName, companyEmail, companyPhone, companyAddress, bankAddress, companyLogo FROM users WHERE id = ?',
      args: [decoded.id]
    });
    const row = resDb.rows[0];
    if (!row) return res.status(401).json({ error: 'User not found' });

    // ensure standard object without complex libsql wrappers
    const user = Object.assign({}, row) as any;
    // Rehydrate the stored-image reference back to a data URI for the client.
    user.companyLogo = await resolveImageRef(user.id as string, user.companyLogo);
    res.json(user);
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

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenResponse.status);
      return res.status(502).send('Authentication failed');
    }

    const tokenParsed = googleTokenSchema.safeParse(await tokenResponse.json());
    if (!tokenParsed.success) {
      console.error('Unexpected Google token response shape');
      return res.status(502).send('Authentication failed');
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenParsed.data.access_token}` }
    });

    if (!userResponse.ok) {
      console.error('Google userinfo request failed:', userResponse.status);
      return res.status(502).send('Authentication failed');
    }

    const userParsed = googleUserInfoSchema.safeParse(await userResponse.json());
    if (!userParsed.success) {
      console.error('Unexpected Google userinfo response shape');
      return res.status(502).send('Authentication failed');
    }

    const userData = userParsed.data;

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
    res.cookie('token', token, authCookieSetOptions);

    // This response contains an inline <script>. Serve it with its own strict
    // CSP that only allows that specific script via a per-response nonce,
    // overriding the app-wide policy set by helmet.
    const nonce = randomBytes(16).toString('base64');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'`
    );

    // Send success message to parent window
    res.send(`
      <html>
        <body>
          <script nonce="${nonce}">
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, ${JSON.stringify(appUrl)});
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
    logError('GET /api/auth/google/callback', error);
    res.status(500).send('Authentication failed');
  }
});

export default router;
