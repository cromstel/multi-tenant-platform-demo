// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
let c = fs.readFileSync('lib/db/mysql.ts', 'utf8');
const d = `    await conn.query(\`
      CREATE TABLE IF NOT EXISTS docs_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role ENUM('owner','admin','member') NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_docs_sections_role_sort (role, sort_order)
      )
    \`);\n\n`;
c = c.replace('  } finally {\n    conn.release();', d + '  } finally {\n    conn.release();');
fs.writeFileSync('lib/db/mysql.ts', c);
console.log('Injected DDL');
