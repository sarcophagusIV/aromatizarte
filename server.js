require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'aromatizarte-secret-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Rutas API
app.use('/api/productos', require('./routes/productos'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/carrito', require('./routes/carrito'));
app.use('/api/ordenes', require('./routes/ordenes'));

// Servir página de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Servir frontend para cualquier ruta no API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ensure admin user exists (email: admin, password: 1234)
(async () => {
  try {
    const bcrypt = require('bcrypt');
    const adminEmail = 'admin';
    const adminPassword = '1234';
    const hash = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, is_admin)
       VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_admin = EXCLUDED.is_admin`,
      [adminEmail, hash, true]
    );

    console.log('✅ Admin user ensured: admin');
  } catch (err) {
    console.error('Error ensuring admin user:', err);
  }
})();

app.listen(PORT, () => {
  console.log(`🌸 Aromatizarte corriendo en http://localhost:${PORT}`);
});