import { createHash, randomUUID } from 'crypto';
import db from './db.js';

/**
 * Content-addressed image store for logo deduplication (Option B).
 *
 * Instead of embedding the same base64 logo inside every invoice's settings and
 * in the user's profile, images are stored once per (userId, content-hash) in
 * the `images` table. Callers persist a short reference (`img:<id>`) and
 * rehydrate it back to a full data URI when reading, so the client, PDF, DOCX
 * and public invoice keep receiving a data URI unchanged.
 */

const REF_PREFIX = 'img:';

/** True when the value is a stored-image reference (`img:<id>`). */
export const isImageRef = (value: string): boolean => value.startsWith(REF_PREFIX);

/** True when the value is an inline image data URI. */
export const isDataUrl = (value: string): boolean => value.startsWith('data:image/');

interface ParsedDataUrl {
  mime: string;
  base64: string;
}

const parseDataUrl = (dataUrl: string): ParsedDataUrl | null => {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), base64: match[2] };
};

/**
 * Store an image data URI for a user, deduplicating by content hash, and return
 * a reference (`img:<id>`). If the input is already a reference it is returned
 * as-is; if it can't be parsed as a data URI, null is returned.
 */
export const storeImage = async (userId: string, value: string | null | undefined): Promise<string | null> => {
  if (!value) return null;
  if (isImageRef(value)) return value; // already a reference
  if (!isDataUrl(value)) return null;

  const parsed = parseDataUrl(value);
  if (!parsed) return null;

  const hash = createHash('sha256').update(parsed.base64).digest('hex');

  // Reuse an existing identical image for this user if present.
  const existing = await db.execute({
    sql: 'SELECT id FROM images WHERE userId = ? AND hash = ?',
    args: [userId, hash],
  });
  const existingId = (existing.rows[0] as any)?.id as string | undefined;
  if (existingId) return `${REF_PREFIX}${existingId}`;

  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO images (id, userId, hash, mime, data) VALUES (?, ?, ?, ?, ?)',
    args: [id, userId, hash, parsed.mime, parsed.base64],
  });
  return `${REF_PREFIX}${id}`;
};

/**
 * Resolve a stored-image reference (`img:<id>`) back to a full data URI.
 * - A data URI passes through unchanged (legacy/inline values).
 * - A reference is looked up and rebuilt as `data:<mime>;base64,<data>`.
 * - Anything unresolved (missing row, empty) returns null.
 *
 * `userId` scopes the lookup so one user can't resolve another's image id.
 */
export const resolveImageRef = async (userId: string, value: string | null | undefined): Promise<string | null> => {
  if (!value) return null;
  if (isDataUrl(value)) return value;
  if (!isImageRef(value)) return null;

  const id = value.slice(REF_PREFIX.length);
  const res = await db.execute({
    sql: 'SELECT mime, data FROM images WHERE id = ? AND userId = ?',
    args: [id, userId],
  });
  const row = res.rows[0] as any;
  if (!row) return null;
  return `data:${row.mime};base64,${row.data}`;
};
