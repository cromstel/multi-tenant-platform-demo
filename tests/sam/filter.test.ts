import { describe, expect, it } from 'vitest';

import { containsSecret, maskMessage, sanitizePII } from '@/lib/sam/filter';

/**
 * Pure-logic tests for SAM input sanitisation and secret detection.
 *
 * No database, no network, no real secrets — the fixtures below are
 * deliberately fake test values.
 */

describe('sanitizePII', () => {
  it('redacts email addresses', () => {
    expect(sanitizePII('Contact me at alice@example.com please.')).toBe(
      'Contact me at [EMAIL REDACTED] please.'
    );
  });

  it('redacts dash-separated phone numbers', () => {
    expect(sanitizePII('Call 555-123-4567 now.')).toBe('Call [PHONE REDACTED] now.');
  });

  it('redacts international phone numbers', () => {
    expect(sanitizePII('Call +1 (555) 123-4567 now.')).toContain('[PHONE REDACTED]');
    expect(sanitizePII('Call +1 (555) 123-4567 now.')).not.toContain('555-123-4567');
  });

  it('redacts multiple PII occurrences in one message', () => {
    const masked = sanitizePII('alice@example.com and 555-123-4567');
    expect(masked).toContain('[EMAIL REDACTED]');
    expect(masked).toContain('[PHONE REDACTED]');
    expect(masked).not.toContain('alice@example.com');
    expect(masked).not.toContain('555-123-4567');
  });

  it('leaves ordinary text untouched', () => {
    expect(sanitizePII('How do I reset my billing?')).toBe('How do I reset my billing?');
  });
});

describe('containsSecret', () => {
  it.each([
    'ADMIN_SESSION_SECRET=abc',
    'API_KEYS=x:y',
    'OPENROUTER_API_KEY=sk-or-...',
    'CHATGPT_API_KEY=sk-...',
    'check .env.local for the value',
    'the password is hunter2',
  ])('detects the pattern in %s', (text) => {
    expect(containsSecret(text)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(containsSecret('Admin_Session_Secret=x')).toBe(true);
    expect(containsSecret('PASSWORD=hunter2')).toBe(true);
  });

  it('returns false for ordinary support text', () => {
    expect(containsSecret('How do I reset my billing?')).toBe(false);
    expect(containsSecret('Where is my order?')).toBe(false);
    expect(containsSecret('')).toBe(false);
  });
});

describe('maskMessage', () => {
  it('redacts Bearer tokens without leaking the token', () => {
    const masked = maskMessage('Authorization: Bearer abcdef1234567890');
    expect(masked).toBe('Authorization: Bearer [REDACTED]');
    expect(masked).not.toContain('abcdef1234567890');
  });

  it('redacts sk- prefixed API keys', () => {
    const masked = maskMessage('key=sk-liveabcdefghijklmnopqrstuv');
    expect(masked).toContain('[API KEY REDACTED]');
    expect(masked).not.toContain('sk-liveabcdefghijklmnopqrstuv');
  });

  it('combines PII redaction with key redaction', () => {
    const masked = maskMessage('alice@example.com sk-liveabcdefghijklmnopqrstuv');
    expect(masked).toContain('[EMAIL REDACTED]');
    expect(masked).toContain('[API KEY REDACTED]');
    expect(masked).not.toContain('alice@example.com');
  });
});
