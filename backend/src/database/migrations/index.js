const fs = require('fs');
const path = require('path');

const migrationsDir = __dirname;

const getMigrationFiles = () => fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const runMigrations = async (pool) => {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const executedResult = await client.query('SELECT id FROM schema_migrations');
    const executed = new Set(executedResult.rows.map((row) => row.id));

    for (const file of getMigrationFiles()) {
      if (executed.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Migration applied: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};

module.exports = {
  runMigrations
};
