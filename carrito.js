const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Carrito en sesión (session-based, sin login)
// GET /api/carrito
router.get('/', (req, res) => {
  const carrito = req.session.carrito || [];
  const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  res.json({ items: carrito, subtotal, total_items: carrito.reduce((s, i) => s + i.cantidad, 0) });
});

// POST /api/carrito/agregar
router.post('/agregar', async (req, res) => {
  try {
    const producto_id = parseInt(req.body.producto_id);
    const cantidad = parseInt(req.body.cantidad) || 1;
    if (!producto_id || isNaN(producto_id)) return res.status(400).json({ error: 'producto_id requerido' });

    const prod = await pool.query('SELECT id, nombre, precio, stock, imagen_url, slug FROM productos WHERE id = $1', [producto_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    const producto = prod.rows[0];

    if (!req.session.carrito) req.session.carrito = [];
    const carrito = req.session.carrito;
    const idx = carrito.findIndex(i => parseInt(i.producto_id) === producto_id);

    const cantidadFinal = idx >= 0 ? carrito[idx].cantidad + cantidad : cantidad;
    if (cantidadFinal > producto.stock) {
      return res.status(400).json({ error: `Stock insuficiente. Máximo disponible: ${producto.stock}`, stock_disponible: producto.stock });
    }

    if (idx >= 0) {
      carrito[idx].cantidad = cantidadFinal;
    } else {
      carrito.push({ producto_id, nombre: producto.nombre, precio: parseFloat(producto.precio), imagen_url: producto.imagen_url, slug: producto.slug, cantidad, stock: producto.stock });
    }

    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const total_items = carrito.reduce((s, i) => s + i.cantidad, 0);
    res.json({ ok: true, items: carrito, subtotal, total_items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

// PUT /api/carrito/actualizar
router.put('/actualizar', async (req, res) => {
  try {
    const producto_id = parseInt(req.body.producto_id);
    const cantidad = parseInt(req.body.cantidad);
    if (!req.session.carrito) return res.status(400).json({ error: 'Carrito vacío' });

    const prod = await pool.query('SELECT stock FROM productos WHERE id = $1', [producto_id]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    if (cantidad > prod.rows[0].stock) {
      return res.status(400).json({ error: `Stock insuficiente. Máximo: ${prod.rows[0].stock}`, stock_disponible: prod.rows[0].stock });
    }

    const carrito = req.session.carrito;
    const idx = carrito.findIndex(i => parseInt(i.producto_id) === producto_id);
    if (idx < 0) return res.status(404).json({ error: 'Producto no está en el carrito' });

    if (cantidad <= 0) {
      carrito.splice(idx, 1);
    } else {
      carrito[idx].cantidad = cantidad;
    }

    const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const total_items = carrito.reduce((s, i) => s + i.cantidad, 0);
    res.json({ ok: true, items: carrito, subtotal, total_items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
});

// DELETE /api/carrito/eliminar/:producto_id
router.delete('/eliminar/:producto_id', (req, res) => {
  if (!req.session.carrito) return res.json({ ok: true, items: [], subtotal: 0, total_items: 0 });

  const id = parseInt(req.params.producto_id);
  req.session.carrito = req.session.carrito.filter(i => parseInt(i.producto_id) !== id);

  const carrito = req.session.carrito;
  const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const total_items = carrito.reduce((s, i) => s + i.cantidad, 0);
  res.json({ ok: true, items: carrito, subtotal, total_items });
});

// DELETE /api/carrito/vaciar
router.delete('/vaciar', (req, res) => {
  req.session.carrito = [];
  res.json({ ok: true, items: [], subtotal: 0, total_items: 0 });
});

module.exports = router;