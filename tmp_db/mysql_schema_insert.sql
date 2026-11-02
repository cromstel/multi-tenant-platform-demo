-- Inserted inside initializeMySQL() after password_reset_tokens (line 186), before finally (line 188)
-- Line range in original: ~187-214 (new block)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        session VARCHAR(36),
        subdomain VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        escalated TINYINT DEFAULT 0
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36),
        role ENUM('user','assistant'),
        content LONGTEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS escalations (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36),
        reason VARCHAR(255),
        resolved TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

-- getMySQLPool() unchanged (lines 200-212 in original)
-- Pattern preserved: initializeMySQL() creates schema; getMySQLPool() awaits schemaPromise then returns getPool()
-- No direct initializeMySQL() call inside getMySQLPool() -> no deadlock
