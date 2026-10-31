import mysql from 'mysql2/promise';
import type { KvClient } from '@/lib/kv-types';

export interface DBRow {
  [key: string]: unknown;
}

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections?: boolean;
  connectionLimit?: number;
  queueLimit?: number;
}

let pool: mysql.Pool | null = null;

/**
 * The schema is created once per process, on first use.
 *
 * Holding the promise (rather than a boolean) means concurrent first-requests
 * all await the same DDL run instead of racing to issue the same `CREATE
 * TABLE` statements.
 */
let schemaPromise: Promise<void> | null = null;

function getMySQLConfig(): MySQLConfig {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'multi_tenant',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

function getPool(): mysql.Pool {
  if (!pool) {
    const config = getMySQLConfig();
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function initializeMySQL(): Promise<void> {
  // The raw pool, deliberately NOT `getMySQLPool()` — that function awaits
  // the schema promise this one produces, so calling it here would deadlock.
  const pool = getPool();
  const conn = await pool.getConnection();
  
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        \`key\` VARCHAR(255) PRIMARY KEY,
        value JSON NOT NULL,
        expires_at BIGINT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin') DEFAULT 'admin',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )
    `);
    
    await conn.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires 
      ON admin_sessions(expires_at)
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subdomain VARCHAR(63) NOT NULL UNIQUE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(120) NOT NULL DEFAULT '',
        last_name VARCHAR(120) NOT NULL DEFAULT '',
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT 'member',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_tenant_email (tenant_id, email)
      )
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tenant_sessions (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES tenant_users(id) ON DELETE CASCADE
      )
    `);
    
    await conn.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_sessions_expires 
      ON tenant_sessions(expires_at)
    `);
    
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contact_enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(160) NULL,
        category ENUM('support', 'sales', 'billing', 'partnership', 'feedback', 'other') NOT NULL DEFAULT 'support',
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contact_enquiries_status (status),
        INDEX idx_contact_enquiries_created (created_at)
      )
    `);
    
  } finally {
    conn.release();
  }
}

/**
 * Returns the shared connection pool, creating the schema on first use.
 *
 * Every call site in the app awaits this, so the DDL runs exactly once per
 * process no matter how many requests arrive at the same moment. A fresh
 * checkout therefore only needs an empty database — no migration step.
 */
export async function getMySQLPool(): Promise<mysql.Pool> {
  if (!schemaPromise) {
    schemaPromise = initializeMySQL().catch((error) => {
      // Clear the memo so the next request retries rather than caching a
      // failure for the lifetime of the process.
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return getPool();
}

export async function closeMySQLPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export interface AdminTenant {
  id: number;
  subdomain: string;
  emoji: string;
  createdAt: Date;
  userCount: number;
  ownerEmail: string | null;
}

export interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  activeTenants: number;
  recentTenants: number; // last 7 days
}

export async function getAdminTenants(
  options: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'subdomain' | 'createdAt' | 'userCount';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ tenants: AdminTenant[]; total: number }> {
  const pool = await getMySQLPool();
  const { search = '', page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  
  const offset = (page - 1) * pageSize;
  const searchParam = `%${search}%`;
  
  const validSortColumns = ['subdomain', 'created_at', 'userCount'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  // Build WHERE clause
  let whereClause = '';
  const params: (string | number)[] = [];
  
  if (search) {
    whereClause = 'WHERE t.subdomain LIKE ? OR u.email LIKE ?';
    params.push(searchParam, searchParam);
  }
  
  // Count total
  const countQuery = `
    SELECT COUNT(DISTINCT t.id) as total
    FROM tenants t
    LEFT JOIN tenant_users u ON u.tenant_id = t.id AND u.role = 'owner'
    ${whereClause}
  `;
  const [countResult] = await pool.execute(countQuery, params);
  const total = Number((countResult as Array<{ total: number }>)[0]?.total) || 0;
  
  // Get paginated tenants with user count and owner email
  const dataQuery = `
    SELECT 
      t.id,
      t.subdomain,
      t.emoji,
      t.created_at as createdAt,
      COUNT(u.id) as userCount,
      MAX(CASE WHEN u.role = 'owner' THEN u.email END) as ownerEmail
    FROM tenants t
    LEFT JOIN tenant_users u ON u.tenant_id = t.id AND u.is_active = TRUE
    ${whereClause}
    GROUP BY t.id, t.subdomain, t.emoji, t.created_at
    ORDER BY ${sortColumn === 'userCount' ? 'userCount' : 't.' + sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;
  
  const [rows] = await pool.execute(dataQuery, [...params, pageSize, offset]);
  
  const tenants: AdminTenant[] = (rows as Array<{
    id: number;
    subdomain: string;
    emoji: string;
    createdAt: Date;
    userCount: number;
    ownerEmail: string | null;
  }>).map(row => ({
    id: row.id,
    subdomain: row.subdomain,
    emoji: row.emoji,
    createdAt: row.createdAt,
    userCount: Number(row.userCount),
    ownerEmail: row.ownerEmail
  }));
  
  return { tenants, total };
}

export async function getAdminStats(): Promise<AdminStats> {
  const pool = await getMySQLPool();
  
  const [totalTenantsResult] = await pool.execute('SELECT COUNT(*) as total FROM tenants');
  const [totalUsersResult] = await pool.execute('SELECT COUNT(*) as total FROM tenant_users WHERE is_active = TRUE');
  const [activeTenantsResult] = await pool.execute('SELECT COUNT(DISTINCT t.id) as total FROM tenants t JOIN tenant_users u ON u.tenant_id = t.id WHERE u.is_active = TRUE');
  const [recentTenantsResult] = await pool.execute(
    'SELECT COUNT(*) as total FROM tenants WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
  );
  
  return {
    totalTenants: Number((totalTenantsResult as Array<{ total: number }>)[0]?.total) || 0,
    totalUsers: Number((totalUsersResult as Array<{ total: number }>)[0]?.total) || 0,
    activeTenants: Number((activeTenantsResult as Array<{ total: number }>)[0]?.total) || 0,
    recentTenants: Number((recentTenantsResult as Array<{ total: number }>)[0]?.total) || 0
  };
}

export async function deleteTenant(subdomain: string): Promise<boolean> {
  const pool = await getMySQLPool();
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    // Get tenant ID first
    const [tenantRows] = await conn.execute('SELECT id FROM tenants WHERE subdomain = ?', [subdomain]);
    const tenant = (tenantRows as Array<{ id: number }>)[0];
    
    if (!tenant) {
      await conn.rollback();
      return false;
    }
    
    const tenantId = tenant.id;
    
    // Delete tenant_users first (FK constraint)
    await conn.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [tenantId]);
    
    // Delete tenant_sessions
    await conn.execute('DELETE FROM tenant_sessions WHERE tenant_id = ?', [tenantId]);
    
    // Delete tenant
    await conn.execute('DELETE FROM tenants WHERE id = ?', [tenantId]);
    
    // Also delete from kv_store for backwards compatibility
    await conn.execute('DELETE FROM kv_store WHERE `key` = ?', [`subdomain:${subdomain}`]);
    
    await conn.commit();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function bulkDeleteTenants(subdomains: string[]): Promise<number> {
  if (subdomains.length === 0) return 0;
  
  const pool = await getMySQLPool();
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    
    let deletedCount = 0;
    
    for (const subdomain of subdomains) {
      const [tenantRows] = await conn.execute('SELECT id FROM tenants WHERE subdomain = ?', [subdomain]);
      const tenant = (tenantRows as Array<{ id: number }>)[0];
      
      if (!tenant) continue;
      
      const tenantId = tenant.id;
      
      await conn.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [tenantId]);
      await conn.execute('DELETE FROM tenant_sessions WHERE tenant_id = ?', [tenantId]);
      await conn.execute('DELETE FROM tenants WHERE id = ?', [tenantId]);
      await conn.execute('DELETE FROM kv_store WHERE `key` = ?', [`subdomain:${subdomain}`]);
      
      deletedCount++;
    }
    
    await conn.commit();
    return deletedCount;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getTenantDetails(subdomain: string): Promise<{
  tenant: AdminTenant & { id: number };
  users: Array<{
    id: number;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  }>;
} | null> {
  const pool = await getMySQLPool();
  
  const [tenantRows] = await pool.execute(
    `SELECT t.*, COUNT(u.id) as userCount 
     FROM tenants t 
     LEFT JOIN tenant_users u ON u.tenant_id = t.id AND u.is_active = TRUE
     WHERE t.subdomain = ?
     GROUP BY t.id`,
    [subdomain]
  );
  
  const tenant = (tenantRows as Array<{
    id: number;
    subdomain: string;
    emoji: string;
    created_at: Date;
    userCount: number;
  }>)[0];
  if (!tenant) return null;
  
  const [userRows] = await pool.execute(
    `SELECT id, email, role, is_active as isActive, created_at as createdAt, 
            (SELECT MAX(created_at) FROM tenant_sessions WHERE user_id = tenant_users.id) as lastLoginAt
     FROM tenant_users 
     WHERE tenant_id = ? AND is_active = TRUE
     ORDER BY created_at DESC`,
    [tenant.id]
  );
  
  return {
    tenant: {
      id: tenant.id,
      subdomain: tenant.subdomain,
      emoji: tenant.emoji,
      createdAt: tenant.created_at,
      userCount: Number(tenant.userCount),
      ownerEmail: null // Would need separate query
    },
    users: (userRows as Array<{
      id: number;
      email: string;
      role: string;
      isActive: number;
      createdAt: Date;
      lastLoginAt: Date | null;
    }>).map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt || null
    }))
  };
}

/**
 * A `KvClient` backed by the MySQL `kv_store` table.
 *
 * This is what the rate limiter uses when MySQL is configured, so counters live
 * in the same durable, shared store as the tenant data. Every method awaits
 * `getMySQLPool()`, which guarantees the schema exists before the first query.
 */
export function createMySQLStore(): KvClient {
  return {
    async get<T>(key: string): Promise<T | null> {
      const pool = await getMySQLPool();
      const [rowsResult] = await pool.execute(
        'SELECT value, expires_at FROM kv_store WHERE `key` = ? AND (expires_at IS NULL OR expires_at > ?)',
        [key, Date.now()]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      const row = rowsResult[0];
      if (!row) return null;
      return row.value as T;
    },

    async set(key: string, value: unknown): Promise<unknown> {
      const pool = await getMySQLPool();
      const expiresAt = typeof value === 'object' && value !== null && 'expiresAt' in value
        ? (value as { expiresAt?: number }).expiresAt ?? null
        : null;
      
      await pool.execute(
        `INSERT INTO kv_store (\`key\`, value, expires_at) 
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value), expiresAt]
      );
      return 'OK';
    },

    async del(...keys: string[]): Promise<number> {
      if (keys.length === 0) return 0;
      const pool = await getMySQLPool();
      const placeholders = keys.map(() => '?').join(',');
      const [result] = await pool.execute(
        `DELETE FROM kv_store WHERE \`key\` IN (${placeholders})`,
        keys
      );
      return (result as { affectedRows: number }).affectedRows;
    },

    async keys(pattern: string): Promise<string[]> {
      const pool = await getMySQLPool();
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const [rowsResult] = await pool.execute(
        'SELECT `key` FROM kv_store WHERE `key` REGEXP ? AND (expires_at IS NULL OR expires_at > ?)',
        [`^${regexPattern}$`, Date.now()]
      );
      const rows = rowsResult as mysql.RowDataPacket[];
      return rows.map(r => String(r.key));
    },

    async mget<T>(...keys: string[]): Promise<(T | null)[]> {
      if (keys.length === 0) return [];
      const pool = await getMySQLPool();
      const placeholders = keys.map(() => '?').join(',');
      const [rowsResult] = await pool.execute(
        `SELECT \`key\`, value FROM kv_store WHERE \`key\` IN (${placeholders}) AND (expires_at IS NULL OR expires_at > ?)`,
        [...keys, Date.now()]
      ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      const rows = rowsResult;
      const map = new Map(rows.map(r => [r.key, r.value]));
      return keys.map(k => map.get(k) as T | null);
    },

    async incr(key: string, by = 1): Promise<number> {
      const pool = await getMySQLPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [rows] = await conn.execute(
          'SELECT value, expires_at FROM kv_store WHERE `key` = ? FOR UPDATE',
          [key]
        ) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
        const current = rows[0];
        let newValue = by;
        let expiresAt: number | null = (current?.expires_at as number) ?? null;
        
        if (current) {
          const parsed = typeof current.value === 'string' ? JSON.parse(current.value as string) : current.value;
          newValue = (typeof parsed === 'number' ? parsed : 0) + 1;
          expiresAt = (current.expires_at as number) ?? null;
        }
        
        await conn.execute(
          `INSERT INTO kv_store (\`key\`, value, expires_at) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE value = VALUES(value), expires_at = VALUES(expires_at), updated_at = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(newValue), expiresAt]
        );
        await conn.commit();
        return newValue;
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },

    async expire(key: string, seconds: number): Promise<unknown> {
      const pool = await getMySQLPool();
      const expiresAt = Date.now() + seconds * 1000;
      await pool.execute(
        `UPDATE kv_store SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE \`key\` = ?`,
        [expiresAt, key]
      );
      return 1;
    }
  };
}
