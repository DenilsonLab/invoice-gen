import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/** JWT payload we sign at login/register: just the user id. */
export interface AuthTokenPayload {
  id: string;
}

/**
 * An Express request that has passed through `authenticate`, so `user` is
 * guaranteed to be present. Route handlers can type their req as this to get
 * `req.user.id` without `any`.
 */
export interface AuthedRequest extends Request {
  user: AuthTokenPayload;
}

/**
 * Verifies the httpOnly `token` cookie and attaches the decoded payload to
 * `req.user`. Responds 401 when the token is missing or invalid.
 *
 * Previously this middleware was copy-pasted into every router; it now lives
 * in one place.
 */
export const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    (req as AuthedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
