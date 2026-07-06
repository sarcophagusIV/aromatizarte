const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/productos - listar todos con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { categoria, destacado, buscar, orden, pagina = 1, limite = 8 } = req.query;
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    const params = [];
    let where = [];

    if (categoria) {
      params.push(categoria);
      where.push(`c.slug = $${params.length}`);
    }
    if (destacado === 'true') {
      where.push(`p.destacado = true`);
    }
    if (buscar) {
      params.push(`%${buscar}%`);
      where.push(`(p.nombre ILIKE $${params.length} OR p.descripcion ILIKE $${params.length})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let orderClause = 'ORDER BY p.id';
    if (orden === 'precio_asc') orderClause = 'ORDER BY p.precio ASC';
    if (orden === 'precio_desc') orderClause = 'ORDER BY p.precio DESC';
    if (orden === 'nombre') orderClause = 'ORDER BY p.nombre ASC';
    if (orden === 'destacado') orderClause = 'ORDER BY p.destacado DESC, p.id';

    // Conteo total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Productos con rating promedio
    params.push(parseInt(limite));
    params.push(offset);
    const query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        COALESCE(AVG(r.puntuacion), 0)::NUMERIC(3,1) as rating_promedio,
        COUNT(r.id) as total_resenas
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN resenas r ON r.producto_id = p.id
      ${whereClause}
      GROUP BY p.id, c.nombre, c.slug
      ${orderClause}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    res.json({
      productos: result.rows,
      paginacion: {
        total,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total_paginas: Math.ceil(total / parseInt(limite))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/:slug - detalle de un producto
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        COALESCE(AVG(r.puntuacion), 0)::NUMERIC(3,1) as rating_promedio,
        COUNT(r.id) as total_resenas
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN resenas r ON r.producto_id = p.id
      WHERE p.slug = $1
      GROUP BY p.id, c.nombre, c.slug
    `;
    const result = await pool.query(query, [slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    // Reseñas
    const resenasResult = await pool.query(
      'SELECT * FROM resenas WHERE producto_id = $1 ORDER BY created_at DESC',
      [result.rows[0].id]
    );

    res.json({ ...result.rows[0], resenas: resenasResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/productos/:slug/resenas - agregar reseña
router.post('/:slug/resenas', async (req, res) => {
  try {
    const { slug } = req.params;
    const { autor, puntuacion, comentario } = req.body;

    const prod = await pool.query('SELECT id FROM productos WHERE slug = $1', [slug]);
    if (!prod.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      return res.status(400).json({ error: 'Puntuación debe ser entre 1 y 5' });
    }

    const result = await pool.query(
      'INSERT INTO resenas (producto_id, autor, puntuacion, comentario) VALUES ($1,$2,$3,$4) RETURNING *',
      [prod.rows[0].id, autor || 'Anónimo', puntuacion, comentario]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar reseña' });
  }
});

const { authenticateJWT, requireAdmin } = require('../middlewares/auth');

// POST /api/productos/admin - crear producto (administradora)
router.post('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, precio, precio_anterior, stock = 0, categoria_id, imagen_url, destacado = false, slug } = req.body;
    if (!nombre || precio == null || !slug) return res.status(400).json({ error: 'nombre, precio y slug son requeridos' });

    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, precio_anterior, stock, categoria_id, imagen_url, destacado, slug)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nombre, descripcion, precio, precio_anterior, stock, categoria_id, imagen_url, destacado, slug]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/productos/admin/:id - actualizar producto (administradora)
router.put('/admin/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['nombre','descripcion','precio','precio_anterior','stock','categoria_id','imagen_url','destacado','slug'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(req.body[key]);
      }
    }

    if (!fields.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    values.push(id);
    const query = `UPDATE productos SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(query, values);
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// PATCH /api/productos/admin/:id/stock - actualizar stock (administradora)
router.patch('/admin/:id/stock', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const s = parseInt(stock);
    if (isNaN(s) || s < 0) return res.status(400).json({ error: 'Stock inválido' });

    const result = await pool.query('UPDATE productos SET stock = $1 WHERE id = $2 RETURNING *', [s, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
});

// DELETE /api/productos/admin/:id - eliminar producto (administradora)
router.delete('/admin/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado', producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;