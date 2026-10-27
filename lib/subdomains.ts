import { getMySQLPool } from '@/lib/db/mysql';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    // Primary validation: Check if the string contains at least one emoji character
    // This regex pattern matches most emoji Unicode ranges
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    // If the regex fails (e.g., in environments that don't support Unicode property escapes),
    // fall back to a simpler validation
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  // Fallback validation: Check if the string is within a reasonable length
  // This is less secure but better than no validation
  return str.length >= 1 && str.length <= 10;
}

/** Normalises a subdomain to the characters allowed in a MySQL key segment. */
export function sanitizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = sanitizeSubdomain(subdomain);
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT emoji, created_at FROM tenants WHERE subdomain = ?',
    [sanitizedSubdomain]
  );
  const row = (rows as Array<{ emoji: string; created_at: Date }>)[0];
  if (!row) return null;
  return {
    emoji: row.emoji,
    createdAt: new Date(row.created_at).getTime()
  };
}

export async function getAllSubdomains() {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT subdomain, emoji, created_at FROM tenants'
  );
  return (rows as Array<{ subdomain: string; emoji: string; created_at: Date }>).map(row => ({
    subdomain: row.subdomain,
    emoji: row.emoji,
    createdAt: new Date(row.created_at).getTime()
  }));
}
