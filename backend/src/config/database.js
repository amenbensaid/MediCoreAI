const { Pool } = require('pg');
require('dotenv').config();

const { runMigrations } = require('../database/migrations');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('@postgres') ? false : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error('Client has been checked out for too long');
  }, 5000);

  client.query = (...args) => originalQuery(...args);

  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  return client;
};

const ensureCompatibilitySchema = async () => {
  await runMigrations(pool);
  console.log('Schema migrations completed');
};

module.exports = {
  query,
  getClient,
  pool,
  ensureCompatibilitySchema
};
