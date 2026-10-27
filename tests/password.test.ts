import { describe, expect, it } from 'vitest';

import { hashPassword, safeEqual, verifyPassword, hashKey } from '@/lib/password';

describe('password hashing', () => {
  it('produces a different hash for the same password each time', async () => {
    const first = await hashPassword('correct horse battery staple');
    const second = await hashPassword('correct horse battery staple');

    // The salt is random, so two hashes of the same password must differ.
    expect(first).not.toBe(second);
  });

  it('stores the hash as salt:hash', async () => {
    const stored = await hashPassword('hunter2');
    expect(stored.split(':')).toHaveLength(2);
  });

  it('verifies a correct password', async () => {
    const stored = await hashPassword('hunter2');
    await expect(verifyPassword('hunter2', stored)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const stored = await hashPassword('hunter2');
    await expect(verifyPassword('hunter3', stored)).resolves.toBe(false);
  });

  it('rejects an empty password', async () => {
    const stored = await hashPassword('hunter2');
    await expect(verifyPassword('', stored)).resolves.toBe(false);
  });

  it('rejects a malformed stored value instead of throwing', async () => {
    await expect(verifyPassword('hunter2', 'not-a-valid-hash')).resolves.toBe(false);
    await expect(verifyPassword('hunter2', '')).resolves.toBe(false);
    await expect(verifyPassword('hunter2', 'onlysalt:')).resolves.toBe(false);
    await expect(verifyPassword('hunter2', ':onlyhash')).resolves.toBe(false);
    await expect(verifyPassword('hunter2', 'a:b:c')).resolves.toBe(false);
  });

  it('handles unicode passwords', async () => {
    const password = 'pässwörd-日本語-🔐';
    const stored = await hashPassword(password);
    await expect(verifyPassword(password, stored)).resolves.toBe(true);
    await expect(verifyPassword('pässwörd-日本語-🔑', stored)).resolves.toBe(false);
  });
});

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('secret', 'secret')).toBe(true);
  });

  it('does not match different strings', () => {
    expect(safeEqual('secret', 'secrex')).toBe(false);
  });

  it('handles strings of different lengths without throwing', () => {
    // `timingSafeEqual` throws on mismatched buffer lengths — hashing first
    // is what stops that.
    expect(safeEqual('short', 'a much longer value')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
    expect(safeEqual('x', '')).toBe(false);
  });
});

describe('hashKey', () => {
  it('is deterministic', () => {
    expect(hashKey('value')).toBe(hashKey('value'));
  });

  it('produces different output for different input', () => {
    expect(hashKey('a')).not.toBe(hashKey('b'));
  });

  it('returns a 64-character hex digest', () => {
    expect(hashKey('value')).toMatch(/^[a-f0-9]{64}$/);
  });
});
