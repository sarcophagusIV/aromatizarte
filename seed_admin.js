const pool = require('../db/pool');
const bcrypt = require('bcrypt');

(async ()=>{
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const email = 'admin';
    const password = '1234';
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, is_admin)
       VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_admin = EXCLUDED.is_admin`,
      [email, hash, true]
    );

    console.log('✅ Admin user ensured (email: admin)');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
})();