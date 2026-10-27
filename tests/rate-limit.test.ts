import { describe, expect, it } from 'vitest';

import { getClientIdentifier } from '@/lib/rate-limit';

/**
 * The rate limiter reads the client address from the request headers, which
 * are only available inside a request scope. These tests cover the parts
 * that do not need one.
 */
describe('rate limit configuration', () => {
  it('exposes a login limit', async () => {
    const { LOGIN_LIMIT } = await import('@/lib/rate-limit');
    expect(LOGIN_LIMIT.max).toBeGreaterThan(0);
    expect(LOGIN_LIMIT.windowMs).toBeGreaterThan(0);
  });

  it('exposes a creation limit', async () => {
    const { CREATE_LIMIT } = await import('@/lib/rate-limit');
    expect(CREATE_LIMIT.max).toBeGreaterThan(0);
    expect(CREATE_LIMIT.windowMs).toBeGreaterThan(0);
  });
});

describe('getClientIdentifier', () => {
  it('rejects outside a request scope', async () => {
    // There is no request here, so `headers()` throws. The function must not
    // swallow that into a fake identifier.
    await expect(getClientIdentifier()).rejects.toThrow();
  });
});
