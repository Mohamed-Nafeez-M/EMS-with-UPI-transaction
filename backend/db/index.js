const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // 30 seconds before idle connection closes
  connectionTimeoutMillis: 5000, // 5 seconds to establish connection
  statement_timeout: 30000, // 30 seconds query timeout
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database Pool Error:', err.message);
  // Don't crash the server - let the next query retry
  if (err.code === 'ECONNREFUSED') {
    console.error('⚠️  Database connection refused. Check if PostgreSQL is running.');
  }
});

pool.on('remove', () => {
  console.log('🔌 Connection removed from pool');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing pool...');
  await pool.end();
  process.exit(0);
});

module.exports = pool;
