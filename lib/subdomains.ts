import { getMySQLPool } from '@/lib/db/mysql';
import { sanitizeSubdomain } from '@/lib/utils';

export { sanitizeSubdomain } from '@/lib/utils';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  return false;
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
