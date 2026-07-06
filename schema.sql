-- Aromatizarte - Schema de base de datos
-- PostgreSQL

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  precio_anterior DECIMAL(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  categoria_id INTEGER REFERENCES categorias(id),
  imagen_url VARCHAR(500),
  destacado BOOLEAN DEFAULT FALSE,
  slug VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resenas (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  autor VARCHAR(100),
  puntuacion INTEGER CHECK (puntuacion BETWEEN 1 AND 5),
  comentario TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Datos de ejemplo
INSERT INTO categorias (nombre, slug) VALUES
  ('Aceite Esencial', 'aceite-esencial'),
  ('Perfume', 'perfume'),
  ('Bruma', 'bruma'),
  ('Difusor', 'difusor')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO productos (nombre, descripcion, precio, precio_anterior, stock, categoria_id, imagen_url, destacado, slug) VALUES
  ('Árbol de Canelo', 'Aroma de bosque húmedo. Purifica y protege. Ideal para difusores y masajes relajantes. Con notas amaderadas que evocan los senderos de un bosque nativo.', 10990, 12990, 15, 1, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop', true, 'arbol-de-canelo'),
  ('Aceite de Lavanda', 'Aroma floral y relajante, perfecto para el descanso y la meditación nocturna. 100% puro y natural.', 8990, NULL, 20, 1, 'https://images.unsplash.com/photo-1595252129096-db2cf6e52faf?w=600&auto=format&fit=crop', true, 'aceite-de-lavanda'),
  ('Bruma de Manzanilla', 'Suaviza y calma la piel sensible. Fragancia delicada y herbácea, ideal para pieles reactivas.', 12990, 14990, 8, 3, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop', true, 'bruma-de-manzanilla'),
  ('Esencia de Eucalipto', 'Refresca y despeja las vías respiratorias. Ideal para inhalaciones de vapor y ambientes de trabajo.', 9490, NULL, 12, 1, 'https://images.unsplash.com/photo-1542736667-069246bdbc6d?w=600&auto=format&fit=crop', true, 'esencia-de-eucalipto'),
  ('Perfume de Rosa', 'Fragancia floral delicada inspirada en los pétalos de rosa silvestre. Para ocasiones especiales y uso diario.', 15990, 18990, 6, 2, 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&auto=format&fit=crop', false, 'perfume-de-rosa'),
  ('Difusor de Bambú', 'Difusor artesanal de bambú con aceites esenciales de temporada. Crea un ambiente armónico en tu hogar.', 24990, NULL, 4, 4, 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=600&auto=format&fit=crop', false, 'difusor-de-bambu'),
  ('Aceite de Menta', 'Energizante y refrescante. Ideal para dolores de cabeza y activar la concentración. Aroma puro y natural.', 7990, NULL, 25, 1, 'https://images.unsplash.com/photo-1628099895579-ee9efb9e5b8d?w=600&auto=format&fit=crop', false, 'aceite-de-menta'),
  ('Bruma de Rosas', 'Hidratante natural con extracto de rosas. Perfuma y refresca el rostro durante el día.', 11490, 13990, 10, 3, 'https://images.unsplash.com/photo-1599733589046-833caccbbd02?w=600&auto=format&fit=crop', false, 'bruma-de-rosas')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO resenas (producto_id, autor, puntuacion, comentario) VALUES
  (1, 'María G.', 5, 'Excelente calidad, el aroma es increíble.'),
  (1, 'Pedro L.', 4, 'Muy buen producto, llegó rápido.'),
  (1, 'Valentina R.', 5, 'Lo recomiendo totalmente.')
ON CONFLICT DO NOTHING;