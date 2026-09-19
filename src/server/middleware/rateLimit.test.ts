import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@libsql/client';

// Shared in-memory libSQL client, created before the module under test is
// imported so the db mock can return it.
const { testDb } = vi.hoisted(() => {
  return { testDb: require('@libsql/client').createClient({ url: ':memory:' }) };
});

// Replace the real db singleton (which would connect to Turso/SQLite).
vi.mock('../db.js', () => ({ default: testDb }));

import { rateLimit } from './rateLimit.js';

const makeReqRes = (ip: string, email: string) => {
  const req = { ip, body: { email } } as any;
  const res = {
    statusCode: 0,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  } as any;
  const next = vi.fn();
  return { req, res, next };
};

// Runs the middleware and resolves once it has finished (it is async).
const run = async (mw: any, req: any, res: any, next: any) => {
  await mw(req, res, next);
};

describe('rateLimit (persistent)', () => {
  beforeEach(async () => {
    await testDb.execute('CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, resetAt INTEGER NOT NULL);');
    await testDb.execute('DELETE FROM rate_limits;');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('allows requests up to the max and blocks the one over', async () => {
    const mw = rateLimit('login', 3, 60_000);
    for (let i = 0; i < 3; i++) {
      const { req, res, next } = makeReqRes('1.1.1.1', 'a@b.com');
      await run(mw, req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(0);
    }
    // 4th attempt within the window is blocked.
    const { req, res, next } = makeReqRes('1.1.1.1', 'a@b.com');
    await run(mw, req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it('resets after the window elapses', async () => {
    const mw = rateLimit('login', 1, 60_000);
    const first = makeReqRes('2.2.2.2', 'c@d.com');
    await run(mw, first.req, first.res, first.next);
    expect(first.next).toHaveBeenCalledOnce();

    const blocked = makeReqRes('2.2.2.2', 'c@d.com');
    await run(mw, blocked.req, blocked.res, blocked.next);
    expect(blocked.res.statusCode).toBe(429);

    // Advance past the window; the next request starts a fresh window.
    vi.advanceTimersByTime(60_001);
    const afterReset = makeReqRes('2.2.2.2', 'c@d.com');
    await run(mw, afterReset.req, afterReset.res, afterReset.next);
    expect(afterReset.next).toHaveBeenCalledOnce();
    expect(afterReset.res.statusCode).toBe(0);
  });

  it('tracks different keys independently', async () => {
    const mw = rateLimit('login', 1, 60_000);
    const a = makeReqRes('3.3.3.3', 'a@x.com');
    await run(mw, a.req, a.res, a.next);
    const b = makeReqRes('3.3.3.3', 'b@x.com');
    await run(mw, b.req, b.res, b.next);
    expect(a.next).toHaveBeenCalledOnce();
    expect(b.next).toHaveBeenCalledOnce();
    expect(b.res.statusCode).toBe(0);
  });

  it('fails open (calls next) when the DB errors', async () => {
    const spy = vi.spyOn(testDb, 'execute').mockRejectedValueOnce(new Error('db down'));
    const mw = rateLimit('login', 1, 60_000);
    const { req, res, next } = makeReqRes('4.4.4.4', 'e@f.com');
    await run(mw, req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(0);
    spy.mockRestore();
  });
});
