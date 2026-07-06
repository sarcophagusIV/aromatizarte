const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 54324,
  database: process.env.DB_NAME || 'aromatizarte',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Licita2026',
});

pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en pool PostgreSQL:', err);
});

module.exports = pool;