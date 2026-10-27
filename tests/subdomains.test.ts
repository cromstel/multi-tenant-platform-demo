import { describe, expect, it } from 'vitest';

import { isValidIcon, sanitizeSubdomain } from '@/lib/subdomains';

describe('sanitizeSubdomain', () => {
  it('lowercases', () => {
    expect(sanitizeSubdomain('ACME')).toBe('acme');
  });

  it('strips characters that are not allowed', () => {
    expect(sanitizeSubdomain('acme corp')).toBe('acmecorp');
    expect(sanitizeSubdomain('acme!@#$')).toBe('acme');
    expect(sanitizeSubdomain('acme.test')).toBe('acmetest');
  });

  it('keeps hyphens and digits', () => {
    expect(sanitizeSubdomain('acme-corp-2024')).toBe('acme-corp-2024');
  });

  it('returns an empty string for input with nothing usable', () => {
    expect(sanitizeSubdomain('!!!')).toBe('');
    expect(sanitizeSubdomain('')).toBe('');
  });

  it('is idempotent', () => {
    const once = sanitizeSubdomain('Acme Corp!');
    expect(sanitizeSubdomain(once)).toBe(once);
  });
});

describe('isValidIcon', () => {
  it('accepts an emoji', () => {
    expect(isValidIcon('🚀')).toBe(true);
    expect(isValidIcon('🎉')).toBe(true);
  });

  it('accepts a short string of emoji', () => {
    expect(isValidIcon('🎉🚀')).toBe(true);
  });

  it('rejects a string longer than 10 characters', () => {
    expect(isValidIcon('a'.repeat(11))).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidIcon('')).toBe(false);
  });

  it('accepts exactly 10 characters', () => {
    expect(isValidIcon('a'.repeat(10))).toBe(true);
  });
});
