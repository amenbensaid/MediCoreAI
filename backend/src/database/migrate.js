require('dotenv').config();

const { pool } = require('../config/database');
const { runMigrations } = require('./migrations');

runMigrations(pool)
  .then(async () => {
    console.log('Database migrations completed');
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Database migrations failed:', error);
    await pool.end();
    process.exit(1);
  });
