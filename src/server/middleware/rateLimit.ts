import type { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../db.js';
import { logError } from '../logger.js';

/**
 * Persistent fixed-window rate limiter backed by the libSQL/Turso database.
 *
 * The previous implementation kept counters in a per-process Map, which is
 * unreliable on serverless platforms (Vercel) where each invocation may run in
 * a fresh process. Persisting the window in the shared database makes the limit
 * hold across instances.
 *
 * Fail-open: if the database is unreachable, the request is allowed through
 * rather than blocked, so a transient DB issue can't lock users out of login.
 */

/** Derives the extra identity portion of the bucket key from the request. */
type KeyPart = (req: Request) => string;

const defaultKeyPart: KeyPart = (req) => req.body?.email || (req as any).user?.id || '';

// Occasionally purge expired rows so the table doesn't grow unbounded.
const purgeExpired = async (now: number) => {
  try {
    await db.execute({ sql: 'DELETE FROM rate_limits WHERE resetAt <= ?', args: [now] });
  } catch {
    // Non-critical maintenance; ignore failures.
  }
};

export const rateLimit = (
  name: string,
  maxAttempts: number,
  windowMs: number,
  keyPart: KeyPart = defaultKeyPart
): RequestHandler => async (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = `${name}:${req.ip}:${keyPart(req)}`;
  const resetAt = now + windowMs;

  try {
    // Atomically upsert the window: start a fresh window when the row is new or
    // expired, otherwise increment the existing count. RETURNING gives us the
    // post-update count and the window's reset time.
    const result = await db.execute({
      sql: `
        INSERT INTO rate_limits (key, count, resetAt)
        VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET
          count = CASE WHEN rate_limits.resetAt <= ? THEN 1 ELSE rate_limits.count + 1 END,
          resetAt = CASE WHEN rate_limits.resetAt <= ? THEN ? ELSE rate_limits.resetAt END
        RETURNING count
      `,
      args: [key, resetAt, now, now, resetAt],
    });

    const count = Number((result.rows[0] as any)?.count ?? 1);

    // Best-effort cleanup roughly 1% of the time.
    if (Math.random() < 0.01) void purgeExpired(now);

    if (count > maxAttempts) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }

    next();
  } catch (error) {
    // Fail open: don't block legitimate traffic on a DB hiccup.
    logError(`rateLimit(${name})`, error);
    next();
  }
};
