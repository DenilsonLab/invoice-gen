import { describe, it, expect, beforeEach, vi } from 'vitest';

const { testDb } = vi.hoisted(() => {
  return { testDb: require('@libsql/client').createClient({ url: ':memory:' }) };
});

vi.mock('./db.js', () => ({ default: testDb }));

import { storeImage, resolveImageRef, isImageRef, isDataUrl } from './images.js';

// A tiny 1x1 transparent PNG data URI.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const JPG = 'data:image/jpeg;base64,QUJDREVG';

describe('images store', () => {
  beforeEach(async () => {
    await testDb.execute('CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, userId TEXT NOT NULL, hash TEXT NOT NULL, mime TEXT NOT NULL, data TEXT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);');
    await testDb.execute('CREATE UNIQUE INDEX IF NOT EXISTS images_user_hash_idx ON images(userId, hash);');
    await testDb.execute('DELETE FROM images;');
  });

  it('helpers detect refs and data URIs', () => {
    expect(isImageRef('img:abc')).toBe(true);
    expect(isImageRef(PNG)).toBe(false);
    expect(isDataUrl(PNG)).toBe(true);
    expect(isDataUrl('img:abc')).toBe(false);
  });

  it('stores a data URI and returns an img: reference', async () => {
    const ref = await storeImage('u1', PNG);
    expect(ref).toMatch(/^img:[0-9a-f-]+$/i);
    const rows = await testDb.execute('SELECT COUNT(*) AS c FROM images');
    expect(Number((rows.rows[0] as any).c)).toBe(1);
  });

  it('deduplicates identical content for the same user (one row, same ref)', async () => {
    const ref1 = await storeImage('u1', PNG);
    const ref2 = await storeImage('u1', PNG);
    expect(ref1).toBe(ref2);
    const rows = await testDb.execute('SELECT COUNT(*) AS c FROM images');
    expect(Number((rows.rows[0] as any).c)).toBe(1);
  });

  it('stores separate rows for different content', async () => {
    await storeImage('u1', PNG);
    await storeImage('u1', JPG);
    const rows = await testDb.execute('SELECT COUNT(*) AS c FROM images');
    expect(Number((rows.rows[0] as any).c)).toBe(2);
  });

  it('keeps different users independent even for identical content', async () => {
    const a = await storeImage('u1', PNG);
    const b = await storeImage('u2', PNG);
    expect(a).not.toBe(b);
    const rows = await testDb.execute('SELECT COUNT(*) AS c FROM images');
    expect(Number((rows.rows[0] as any).c)).toBe(2);
  });

  it('passes an existing reference through unchanged', async () => {
    expect(await storeImage('u1', 'img:already-a-ref')).toBe('img:already-a-ref');
  });

  it('returns null for empty or non-image input', async () => {
    expect(await storeImage('u1', null)).toBeNull();
    expect(await storeImage('u1', '')).toBeNull();
    expect(await storeImage('u1', 'not-a-data-uri')).toBeNull();
  });

  it('resolves a reference back to the original data URI', async () => {
    const ref = await storeImage('u1', PNG);
    const resolved = await resolveImageRef('u1', ref);
    expect(resolved).toBe(PNG);
  });

  it('passes a data URI through resolve unchanged', async () => {
    expect(await resolveImageRef('u1', PNG)).toBe(PNG);
  });

  it('does not resolve a reference for a different user', async () => {
    const ref = await storeImage('u1', PNG);
    expect(await resolveImageRef('u2', ref)).toBeNull();
  });

  it('returns null resolving a missing reference or empty value', async () => {
    expect(await resolveImageRef('u1', 'img:does-not-exist')).toBeNull();
    expect(await resolveImageRef('u1', null)).toBeNull();
    expect(await resolveImageRef('u1', '')).toBeNull();
  });

  it('round-trips: store then resolve yields the original', async () => {
    const ref = await storeImage('u1', JPG);
    expect(await resolveImageRef('u1', ref)).toBe(JPG);
  });
});
