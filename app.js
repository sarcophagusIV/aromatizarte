/* ============================================================
   AROMATIZARTE — app.js
   Manejo del catálogo, modal de producto, carrito y formulario prepago
   ============================================================ */

// ── Estado global ──────────────────────────────────────────
const state = {
  pagina: 1,
  limite: 8,
  categoria: '',
  orden: 'destacado',
  buscar: '',
  totalPaginas: 1,
  carrito: { items: [], subtotal: 0, total_items: 0 },
  resenaStars: 0,
};

// ── Utilidades ─────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

function renderStars(rating, interactive = false) {
  const full = Math.round(Number(rating));
  return [1, 2, 3, 4, 5].map(i =>
    interactive
      ? `<button type="button" class="star-sel-btn ${i <= full ? 'filled' : ''}" data-val="${i}">★</button>`
      : `<span style="color:${i <= full ? 'var(--blush)' : 'var(--lavender-lt)'}">★</span>`
  ).join('');
}

let toastTimer;
function showToast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Imagen con fallback robusto ────────────────────────────
const IMG_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23F0EBF8" width="400" height="300"/%3E%3Ccircle cx="200" cy="120" r="40" fill="%23D4C5E9"/%3E%3Cpath d="M160 180 Q200 150 240 180 L240 240 L160 240Z" fill="%23D4C5E9"/%3E%3C/svg%3E';

function setImgFallback(img) {
  img.addEventListener('error', function onErr() {
    this.removeEventListener('error', onErr);
    this.src = IMG_FALLBACK;
  });
}

// ── API helpers ────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Error de red');
  return data;
}

// ── Cargar categorías ──────────────────────────────────────
async function loadCategorias() {
  try {
    const cats = await apiFetch('/api/categorias');
    const pills = $('#filterPills');
    cats.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.dataset.categoria = c.slug;
      btn.textContent = `${c.nombre} (${c.total_productos})`;
      pills.appendChild(btn);
    });
    pills.addEventListener('click', e => {
      const btn = e.target.closest('.pill');
      if (!btn) return;
      $$('.pill', pills).forEach(p => p.classList.remove('pill--active'));
      btn.classList.add('pill--active');
      state.categoria = btn.dataset.categoria;
      state.pagina = 1;
      loadProductos();
    });
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}

// ── Cargar productos ───────────────────────────────────────
async function loadProductos() {
  const grid = $('#productosGrid');

  grid.innerHTML = `<div class="loading-skeleton">
    ${Array(4).fill('<div class="skeleton-card"></div>').join('')}
  </div>`;

  try {
    const params = new URLSearchParams({
      pagina: state.pagina,
      limite: state.limite,
      orden: state.orden,
    });
    if (state.categoria) params.set('categoria', state.categoria);
    if (state.buscar) params.set('buscar', state.buscar);

    const data = await apiFetch(`/api/productos?${params}`);
    state.totalPaginas = data.paginacion.total_paginas;

    grid.innerHTML = '';

    if (!data.productos.length) {
      grid.innerHTML = `<div class="no-results">
        <svg width="48" height="48" fill="none" stroke="var(--lavender-lt)" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <p>No encontramos productos con ese filtro.</p>
      </div>`;
      renderPagination();
      return;
    }

    data.productos.forEach(p => {
      const card = createProductoCard(p);
      grid.appendChild(card);
    });

    renderPagination();
  } catch (err) {
    grid.innerHTML = `<div class="no-results"><p>Error al cargar productos. Intenta de nuevo.</p></div>`;
    showToast('Error al cargar productos', 'error');
  }
}

function createProductoCard(p) {
  const div = document.createElement('article');
  div.className = 'producto-card';
  const sinStock = p.stock <= 0;
  div.innerHTML = `
    <div class="producto-card__img-wrap">
      <img src="${p.imagen_url || IMG_FALLBACK}"
           alt="${p.nombre}" loading="lazy" />
      ${p.destacado ? '<span class="badge-destacado">Destacado</span>' : ''}
      ${sinStock ? '<span class="badge-sin-stock">Sin stock</span>' : ''}
    </div>
    <div class="producto-card__body">
      <p class="producto-card__cat">${p.categoria_nombre || ''}</p>
      <h3 class="producto-card__name">${p.nombre}</h3>
      <p class="producto-card__desc">${p.descripcion || ''}</p>
      <div class="producto-card__rating">
        <span class="stars">${renderStars(p.rating_promedio)}</span>
        <span class="rating-count">(${p.total_resenas})</span>
      </div>
    </div>
    <div class="producto-card__footer">
      <div class="precio-wrap">
        <span class="precio-actual">${formatPrecio(p.precio)}</span>
        ${p.precio_anterior ? `<span class="precio-anterior">${formatPrecio(p.precio_anterior)}</span>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <button class="btn-agregar" ${sinStock ? 'disabled' : ''} data-id="${p.id}">
          ${sinStock ? 'Agotado' : 'Agregar'}
        </button>
        <button class="btn-ver-detalle" data-slug="${p.slug}">Ver más</button>
      </div>
    </div>
  `;

  // Fallback en imágenes de tarjeta
  setImgFallback(div.querySelector('img'));

  div.querySelector('.btn-ver-detalle').addEventListener('click', () => openModal(p.slug));
  if (!sinStock) {
    div.querySelector('.btn-agregar').addEventListener('click', () => agregarAlCarrito(p.id, 1));
  }
  return div;
}

// ── Paginación ─────────────────────────────────────────────
function renderPagination() {
  const pag = $('#pagination');
  pag.innerHTML = '';
  if (state.totalPaginas <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'page-btn'; prev.textContent = '←';
  prev.disabled = state.pagina === 1;
  prev.addEventListener('click', () => { state.pagina--; loadProductos(); window.scrollTo({ top: $('#catalogo').offsetTop - 80, behavior: 'smooth' }); });
  pag.appendChild(prev);

  for (let i = 1; i <= state.totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === state.pagina ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { state.pagina = i; loadProductos(); window.scrollTo({ top: $('#catalogo').offsetTop - 80, behavior: 'smooth' }); });
    pag.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn'; next.textContent = '→';
  next.disabled = state.pagina === state.totalPaginas;
  next.addEventListener('click', () => { state.pagina++; loadProductos(); window.scrollTo({ top: $('#catalogo').offsetTop - 80, behavior: 'smooth' }); });
  pag.appendChild(next);
}

// ── Modal producto ─────────────────────────────────────────
async function openModal(slug) {
  const overlay = $('#modalOverlay');
  const inner = $('#modalInner');

  inner.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-lt)">Cargando…</div>`;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  try {
    const p = await apiFetch(`/api/productos/${slug}`);
    renderModal(p);
  } catch (err) {
    inner.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger)">Error al cargar producto.</div>`;
  }
}

function renderModal(p) {
  const inner = $('#modalInner');
  const sinStock = p.stock <= 0;

  inner.innerHTML = `
    <div class="modal__gallery">
      <img src="${p.imagen_url || IMG_FALLBACK}" alt="${p.nombre}" />
    </div>
    <div class="modal__info">
      <p class="modal__cat">${p.categoria_nombre || ''}</p>
      <h2 class="modal__name" id="modalTitle">${p.nombre}</h2>

      <div class="modal__rating">
        <span class="stars">${renderStars(p.rating_promedio)}</span>
        <span>${Number(p.rating_promedio).toFixed(1)} — ${p.total_resenas} reseña${p.total_resenas !== 1 ? 's' : ''}</span>
        <a href="#resenas-section">| Añadir una reseña</a>
      </div>

      <div class="modal__precio">
        <span class="modal__precio-actual" style="${sinStock ? 'opacity:.5' : ''}">${formatPrecio(p.precio)}</span>
        ${p.precio_anterior ? `<span class="modal__precio-ant">${formatPrecio(p.precio_anterior)}</span>` : ''}
      </div>
      <p class="modal__stock">Stock disponible: <strong>${p.stock}</strong> unidades</p>

      <!-- Tabs -->
      <div class="modal__tabs">
        <button class="tab-btn active" data-tab="descripcion">Descripción</button>
        <button class="tab-btn" data-tab="componentes">Componentes</button>
        <button class="tab-btn" data-tab="aplicacion">Aplicación</button>
        <button class="tab-btn" data-tab="valoraciones">Valoraciones</button>
      </div>
      <div id="tab-descripcion" class="tab-content active">
        <p>${p.descripcion || 'Sin descripción disponible.'}</p>
      </div>
      <div id="tab-componentes" class="tab-content">
        <p>Ingredientes naturales de origen sustentable, libres de parabenos y químicos agresivos.</p>
      </div>
      <div id="tab-aplicacion" class="tab-content">
        <p>Aplica directamente en difusor, mezcla con aceite portador para uso tópico, o añade unas gotas al baño.</p>
      </div>
      <div id="tab-valoraciones" class="tab-content" id="resenas-section">
        ${renderResenas(p.resenas || [])}
        ${renderFormResena(p.slug)}
      </div>

      <!-- Cantidad + Agregar -->
      <div class="modal__cantidad-row" style="${sinStock ? 'opacity:.5;pointer-events:none' : ''}">
        <div class="cantidad-ctrl">
          <button type="button" id="cantMenos">−</button>
          <input type="number" id="cantInput" value="1" min="1" max="${p.stock}" />
          <button type="button" id="cantMas">+</button>
        </div>
        <button class="btn btn--primary" id="btnAgregarModal" ${sinStock ? 'disabled' : ''} data-id="${p.id}">
          ${sinStock ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  `;

  // Fallback imagen modal
  setImgFallback($('.modal__gallery img', inner));

  // Tab switching
  $$('.tab-btn', inner).forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn', inner).forEach(b => b.classList.remove('active'));
      $$('.tab-content', inner).forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $(`#tab-${btn.dataset.tab}`, inner).classList.add('active');
    });
  });

  // Cantidad
  const cantInput = $('#cantInput');
  $('#cantMenos').addEventListener('click', () => {
    const v = Math.max(1, parseInt(cantInput.value) - 1);
    cantInput.value = v;
  });
  $('#cantMas').addEventListener('click', () => {
    const v = Math.min(p.stock, parseInt(cantInput.value) + 1);
    cantInput.value = v;
  });
  cantInput.addEventListener('change', () => {
    cantInput.value = Math.min(p.stock, Math.max(1, parseInt(cantInput.value) || 1));
  });

  // Agregar al carrito desde modal
  if (!sinStock) {
    $('#btnAgregarModal').addEventListener('click', () => {
      agregarAlCarrito(p.id, parseInt(cantInput.value));
    });
  }

  // Formulario reseña
  initFormResena(p.slug);
}

function renderResenas(resenas) {
  if (!resenas.length) return '<p style="color:var(--text-lt);font-size:.82rem">Aún no hay reseñas. ¡Sé el primero!</p>';
  return `<div class="modal__resenas">
    <h4>Reseñas (${resenas.length})</h4>
    ${resenas.map(r => `
      <div class="resena-item">
        <div class="resena-meta">
          <span class="resena-autor">${r.autor}</span>
          <span class="resena-stars">${'★'.repeat(r.puntuacion)}${'☆'.repeat(5 - r.puntuacion)}</span>
        </div>
        <p class="resena-texto">${r.comentario || ''}</p>
      </div>
    `).join('')}
  </div>`;
}

function renderFormResena(slug) {
  return `
    <div class="agregar-resena" style="margin-top:20px">
      <h5>Añadir una reseña</h5>
      <div class="resena-form" id="resenaForm" data-slug="${slug}">
        <input type="text" id="resenaAutor" placeholder="Tu nombre (opcional)" />
        <div class="star-selector" id="starSelector">${renderStars(0, true)}</div>
        <textarea id="resenaComentario" placeholder="Escribe tu experiencia con este producto…"></textarea>
        <button type="button" class="btn btn--primary" id="btnEnviarResena" style="width:fit-content">Enviar reseña</button>
      </div>
    </div>
  `;
}

function initFormResena(slug) {
  state.resenaStars = 0;
  const starSel = $('#starSelector');
  if (!starSel) return;

  function updateStars(val) {
    state.resenaStars = val;
    $$('.star-sel-btn', starSel).forEach((btn, i) => {
      btn.classList.toggle('filled', i < val);
    });
  }

  starSel.addEventListener('click', e => {
    const btn = e.target.closest('.star-sel-btn');
    if (btn) updateStars(parseInt(btn.dataset.val));
  });

  $('#btnEnviarResena')?.addEventListener('click', async () => {
    const autor = $('#resenaAutor')?.value.trim();
    const comentario = $('#resenaComentario')?.value.trim();
    const puntuacion = state.resenaStars;

    if (!puntuacion) { showToast('Selecciona una puntuación', 'warning'); return; }

    try {
      await apiFetch(`/api/productos/${slug}/resenas`, {
        method: 'POST',
        body: JSON.stringify({ autor, puntuacion, comentario }),
      });
      showToast('¡Reseña enviada! Gracias.', 'success');
      openModal(slug);
    } catch (err) {
      showToast(err.message || 'Error al enviar reseña', 'error');
    }
  });
}

// Cerrar modal
function closeModal() {
  $('#modalOverlay').hidden = true;
  document.body.style.overflow = '';
}
$('#modalClose').addEventListener('click', closeModal);
$('#modalOverlay').addEventListener('click', e => {
  if (e.target === $('#modalOverlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); closePrepago(); }
});

// ── Carrito ────────────────────────────────────────────────
async function loadCarrito() {
  try {
    const data = await apiFetch('/api/carrito');
    state.carrito = data;
    renderCarrito();
  } catch (err) {
    console.error('Error cargando carrito:', err);
  }
}

async function agregarAlCarrito(producto_id, cantidad) {
  const btns = document.querySelectorAll(`[data-id="${producto_id}"]`);
  btns.forEach(b => { b.disabled = true; b.textContent = 'Agregando…'; });

  try {
    const data = await apiFetch('/api/carrito/agregar', {
      method: 'POST',
      body: JSON.stringify({ producto_id: parseInt(producto_id), cantidad: parseInt(cantidad) }),
    });
    state.carrito = data;
    renderCarrito();
    showToast('Producto agregado al carrito ✓', 'success');
    openCart();
  } catch (err) {
    showToast(err.message || 'Error al agregar al carrito', 'error');
  } finally {
    btns.forEach(b => {
      b.disabled = false;
      b.textContent = 'Agregar';
    });
  }
}

async function actualizarCantidad(producto_id, cantidad) {
  try {
    const data = await apiFetch('/api/carrito/actualizar', {
      method: 'PUT',
      body: JSON.stringify({ producto_id: parseInt(producto_id), cantidad: parseInt(cantidad) }),
    });
    state.carrito = data;
    renderCarrito();
  } catch (err) {
    showToast(err.message || 'Error al actualizar', 'error');
  }
}

async function eliminarDelCarrito(producto_id) {
  try {
    const data = await apiFetch(`/api/carrito/eliminar/${producto_id}`, { method: 'DELETE' });
    state.carrito = data;
    renderCarrito();
  } catch (err) {
    showToast('Error al eliminar producto', 'error');
  }
}

async function vaciarCarrito() {
  try {
    const data = await apiFetch('/api/carrito/vaciar', { method: 'DELETE' });
    state.carrito = data;
    renderCarrito();
    showToast('Carrito vaciado');
  } catch (err) {
    showToast('Error al vaciar carrito', 'error');
  }
}

function renderCarrito() {
  const raw = state.carrito || {};
  const items = raw.items ?? raw.carrito ?? [];
  const subtotal = raw.subtotal ?? 0;
  const total_items = raw.total_items ?? 0;
  const badge = $('#cartBadge');
  const cartItems = $('#cartItems');
  const cartEmpty = $('#cartEmpty');
  const cartFooter = $('#cartFooter');
  const cartSubtotal = $('#cartSubtotal');

  if (total_items > 0) {
    badge.hidden = false;
    badge.textContent = total_items > 99 ? '99+' : total_items;
  } else {
    badge.hidden = true;
  }

  if (!items.length) {
    cartEmpty.style.display = 'flex';
    cartItems.innerHTML = '';
    cartFooter.hidden = true;
    return;
  }

  cartEmpty.style.display = 'none';
  cartFooter.hidden = false;
  cartSubtotal.textContent = formatPrecio(subtotal);

  cartItems.innerHTML = items.map(item => `
    <li class="cart-item">
      <img class="cart-item__img"
           src="${item.imagen_url || IMG_FALLBACK}"
           alt="${item.nombre}" loading="lazy"
           onerror="this.src='${IMG_FALLBACK}'" />
      <div class="cart-item__info">
        <p class="cart-item__name">${item.nombre}</p>
        <p class="cart-item__price">${formatPrecio(item.precio * item.cantidad)}</p>
        <div class="cart-item__controls">
          <div class="cart-qty">
            <button type="button" data-action="menos" data-id="${item.producto_id}" data-qty="${item.cantidad}">−</button>
            <span>${item.cantidad}</span>
            <button type="button" data-action="mas" data-id="${item.producto_id}" data-qty="${item.cantidad}" data-stock="${item.stock}">+</button>
          </div>
          <button class="cart-item__remove" data-action="eliminar" data-id="${item.producto_id}">Eliminar</button>
        </div>
      </div>
    </li>
  `).join('');

  cartItems.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id, qty, stock } = btn.dataset;
      const pid = parseInt(id);
      const cantidad = parseInt(qty);
      if (action === 'menos') actualizarCantidad(pid, cantidad - 1);
      if (action === 'mas') {
        if (cantidad >= parseInt(stock)) { showToast(`Stock máximo: ${stock}`, 'warning'); return; }
        actualizarCantidad(pid, cantidad + 1);
      }
      if (action === 'eliminar') eliminarDelCarrito(pid);
    });
  });
}

function openCart() {
  $('#cartDrawer').classList.add('open');
  $('#cartOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  $('#cartDrawer').classList.remove('open');
  $('#cartOverlay').hidden = true;
  document.body.style.overflow = '';
}

$('#cartToggle').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#cartOverlay').addEventListener('click', closeCart);
$('#vaciarCarritoBtn').addEventListener('click', vaciarCarrito);
$('#irTiendaBtn').addEventListener('click', () => { closeCart(); });

// ── Botón "Proceder al pago" → abre formulario prepago ────
document.querySelector('.cart-checkout').addEventListener('click', () => {
  const raw = state.carrito || {};
  const items = raw.items ?? [];
  if (!items.length) { showToast('Tu carrito está vacío', 'warning'); return; }
  closeCart();
  openPrepago();
});

// ── Buscador ────────────────────────────────────────────────
let searchDebounce;
$('.search-toggle').addEventListener('click', () => {
  $('#searchBar').classList.toggle('open');
  if ($('#searchBar').classList.contains('open')) $('#searchInput').focus();
});
$('#searchClose').addEventListener('click', () => {
  $('#searchBar').classList.remove('open');
  if (state.buscar) { state.buscar = ''; state.pagina = 1; loadProductos(); }
});
$('#searchInput').addEventListener('input', e => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.buscar = e.target.value.trim();
    state.pagina = 1;
    loadProductos();
  }, 400);
});

// ── Ordenar ─────────────────────────────────────────────────
$('#selectOrden').addEventListener('change', e => {
  state.orden = e.target.value;
  state.pagina = 1;
  loadProductos();
});

// ══════════════════════════════════════════════════════════
//  FORMULARIO DE PREPAGO
// ══════════════════════════════════════════════════════════

function openPrepago() {
  $('#prepagoOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
  renderPrepagoResumen();
}

function closePrepago() {
  $('#prepagoOverlay').hidden = true;
  document.body.style.overflow = '';
}

// Validar RUT chileno (formato: 12.345.678-9 ó 12345678-9)
function validarRut(rut) {
  const clean = rut.replace(/[\.\-]/g, '');
  if (!/^\d{7,8}[0-9kK]$/.test(clean)) return false;
  const cuerpo = clean.slice(0, -1);
  let dv = clean.slice(-1).toUpperCase();
  let suma = 0, multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalc = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);
  return dv === dvCalc;
}

// Formatear RUT al escribir
function formatearRut(rut) {
  const clean = rut.replace(/[\.\-]/g, '').replace(/[^0-9kK]/g, '');
  if (clean.length <= 1) return clean;
  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

function renderPrepagoResumen() {
  const raw = state.carrito || {};
  const items = raw.items ?? [];
  const subtotal = raw.subtotal ?? 0;

  const resumenHTML = items.map(item => `
    <div class="prepago-item">
      <span class="prepago-item__nombre">${item.nombre} <em>×${item.cantidad}</em></span>
      <span class="prepago-item__precio">${formatPrecio(item.precio * item.cantidad)}</span>
    </div>
  `).join('');

  $('#prepagoResumen').innerHTML = `
    ${resumenHTML}
    <div class="prepago-item prepago-item--total">
      <span>Subtotal productos</span>
      <strong>${formatPrecio(subtotal)}</strong>
    </div>
  `;
}

// Validar correo electrónico
function validarCorreo(correo) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(correo);
}

// Validar celular chileno
function validarCelular(celular) {
  const clean = celular.replace(/[\s\-\+]/g, '');
  return clean.length >= 8;
}

// Validar todos los campos del formulario
function validarCampos() {
  let ok = true;

  const campos = [
    { id: 'prepagoNombre', validar: v => v.trim().length >= 2, msg: 'Ingresa tu nombre (mínimo 2 caracteres).' },
    { id: 'prepagoApellido', validar: v => v.trim().length >= 2, msg: 'Ingresa tu apellido (mínimo 2 caracteres).' },
    { id: 'prepagoCorreo', validar: v => validarCorreo(v), msg: 'Ingresa un correo electrónico válido.' },
    { id: 'prepagoCelular', validar: v => validarCelular(v), msg: 'Ingresa un número de celular válido.' },
    { id: 'prepagoDireccion', validar: v => v.trim().length >= 5, msg: 'Ingresa una dirección válida.' },
    { id: 'prepagoComuna', validar: v => v.trim().length >= 2, msg: 'Ingresa la comuna de despacho.' },
  ];

  campos.forEach(({ id, validar, msg }) => {
    const input = $(`#${id}`);
    const val = input.value;
    const errorEl = $(`#error-${id}`);
    if (!validar(val)) {
      input.classList.add('input-error');
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      ok = false;
    } else {
      input.classList.remove('input-error');
      errorEl.style.display = 'none';
    }
  });

  return ok;
}

// ── Eventos formulario prepago ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Limpiar errores al escribir en todos los campos
  ['prepagoNombre', 'prepagoApellido', 'prepagoCorreo', 'prepagoCelular', 'prepagoDireccion', 'prepagoComuna'].forEach(id => {
    $(`#${id}`)?.addEventListener('input', function () {
      $(`#error-${id}`).style.display = 'none';
      this.classList.remove('input-error');
    });
  });

  // Cerrar prepago
  $('#prepagoClose')?.addEventListener('click', closePrepago);
  $('#prepagoOverlay')?.addEventListener('click', e => {
    if (e.target === $('#prepagoOverlay')) closePrepago();
  });
  $('#prepagoCancelar')?.addEventListener('click', closePrepago);

  // Enviar formulario prepago
  $('#prepagoContinuar')?.addEventListener('click', () => {
    if (!validarCampos()) {
      showToast('Por favor corrige los campos indicados', 'warning');
      return;
    }

    // Datos recopilados
    const datosEnvio = {
      nombre: $('#prepagoNombre').value.trim(),
      apellido: $('#prepagoApellido').value.trim(),
      correo: $('#prepagoCorreo').value.trim(),
      celular: $('#prepagoCelular').value.trim(),
      direccion: $('#prepagoDireccion').value.trim(),
      comuna: $('#prepagoComuna').value.trim(),
    };

    // Guardar en sessionStorage para etapa de pago (próxima HU)
    sessionStorage.setItem('aromatizarte_envio', JSON.stringify(datosEnvio));

    // Mostrar confirmación y simular redirect a pasarela
    closePrepago();
    mostrarConfirmacionPrepago(datosEnvio);
  });
});

function mostrarConfirmacionPrepago(datos) {
  const raw = state.carrito || {};
  const subtotal = raw.subtotal ?? 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirmacionOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px">
      <button class="modal__close" id="confirmClose" aria-label="Cerrar">✕</button>
      <div style="padding:36px 40px;text-align:center">
        <div style="font-size:2.8rem;margin-bottom:12px">🛒</div>
        <h2 style="font-family:var(--font-display);color:var(--text-dk);margin-bottom:6px">Confirma tu pedido</h2>
        <p style="color:var(--text-md);font-size:.875rem;margin-bottom:20px">Revisa tus datos antes de continuar al pago.</p>
        <div style="background:var(--lavender-bg);border-radius:var(--radius-md);padding:16px 20px;text-align:left;margin-bottom:24px;font-size:.85rem;color:var(--text-md);display:flex;flex-direction:column;gap:6px">
          <p><strong>Nombre:</strong> ${datos.nombre} ${datos.apellido}</p>
          <p><strong>Correo:</strong> ${datos.correo}</p>
          <p><strong>Celular:</strong> ${datos.celular}</p>
          <p><strong>Dirección:</strong> ${datos.direccion}</p>
          <p><strong>Comuna:</strong> ${datos.comuna}</p>
          <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--lavender-lt);display:flex;justify-content:space-between;align-items:center">
            <strong>Total a pagar</strong>
            <span style="color:var(--lavender-dk);font-family:var(--font-display);font-size:1.25rem;font-weight:600">${formatPrecio(subtotal)}</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button class="btn btn--ghost" id="volverPrepago">← Volver</button>
          <button class="btn btn--primary" id="irPasarela">Pagar ahora →</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  $('#confirmClose').addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
  });

  $('#volverPrepago').addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
    openPrepago();
  });

  $('#irPasarela').addEventListener('click', () => {
    document.body.removeChild(overlay);
    abrirPasarelaSimulada(datos, subtotal);
  });
}

// ══════════════════════════════════════════════════════════
//  PASARELA DE PAGO SIMULADA
// ══════════════════════════════════════════════════════════

function abrirPasarelaSimulada(datosEnvio, subtotal) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pasarelaOverlay';

  overlay.innerHTML = `
    <div class="modal pasarela-modal" id="pasarelaModal" role="dialog" aria-modal="true">

      <!-- Header pasarela -->
      <div class="pasarela-header">
        <div class="pasarela-logo">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="13" stroke="#7B5EA7" stroke-width="1.5"/><path d="M14 6c0 4.418-3.582 8-8 8 4.418 0 8 3.582 8 8 0-4.418 3.582-8 8-8-4.418 0-8-3.582-8-8z" fill="#7B5EA7"/></svg>
          <span>Aromatizarte <em>· Pago seguro</em></span>
        </div>
        <div class="pasarela-seguro">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Conexión segura SSL
        </div>
      </div>

      <!-- Cuerpo: 2 columnas -->
      <div class="pasarela-body">

        <!-- Col izquierda: resumen -->
        <div class="pasarela-resumen">
          <h4>Resumen del pedido</h4>
          <div id="pasarelaItems" class="pasarela-items"></div>
          <div class="pasarela-total-row">
            <span>Total</span>
            <strong>${formatPrecio(subtotal)}</strong>
          </div>
          <div class="pasarela-envio-info">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
            Envío a: <strong>${datosEnvio.direccion}, ${datosEnvio.comuna}</strong>
          </div>
        </div>

        <!-- Col derecha: formulario pago -->
        <div class="pasarela-form-wrap" id="pasarelaFormWrap">

          <div class="pasarela-tabs">
            <button class="pasarela-tab active" data-metodo="tarjeta">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Tarjeta
            </button>
            <button class="pasarela-tab" data-metodo="transferencia">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              Transferencia
            </button>
          </div>

          <!-- Panel tarjeta -->
          <div id="panelTarjeta" class="pasarela-panel active">
            <div class="tarjeta-visual" id="tarjetaVisual">
              <div class="tarjeta-chip">
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none"><rect x="1" y="1" width="26" height="20" rx="3" fill="#C9A84C" stroke="#B8942A" stroke-width=".5"/><rect x="9" y="1" width="1" height="20" fill="#B8942A" opacity=".5"/><rect x="18" y="1" width="1" height="20" fill="#B8942A" opacity=".5"/><rect x="1" y="8" width="26" height="1" fill="#B8942A" opacity=".5"/><rect x="1" y="13" width="26" height="1" fill="#B8942A" opacity=".5"/></svg>
              </div>
              <div class="tarjeta-red" id="tarjetaRed">VISA</div>
              <div class="tarjeta-numero" id="tarjetaNumero">•••• •••• •••• ••••</div>
              <div class="tarjeta-bottom">
                <div>
                  <div class="tarjeta-label">Titular</div>
                  <div class="tarjeta-titular" id="tarjetaTitular">NOMBRE APELLIDO</div>
                </div>
                <div>
                  <div class="tarjeta-label">Vence</div>
                  <div class="tarjeta-expiry" id="tarjetaExpiry">MM/AA</div>
                </div>
              </div>
            </div>

            <div class="pasarela-campos">
              <div class="form-group">
                <label for="cardNumero">Número de tarjeta</label>
                <div class="card-input-wrap">
                  <input type="text" id="cardNumero" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric" autocomplete="cc-number" />
                  <span class="card-brand-icon" id="cardBrandIcon">💳</span>
                </div>
                <span class="form-error" id="error-cardNumero"></span>
              </div>
              <div class="form-group">
                <label for="cardTitular">Nombre en la tarjeta</label>
                <input type="text" id="cardTitular" placeholder="Igual que aparece en la tarjeta" autocomplete="cc-name" />
                <span class="form-error" id="error-cardTitular"></span>
              </div>
              <div class="pasarela-row-2">
                <div class="form-group">
                  <label for="cardExpiry">Vencimiento</label>
                  <input type="text" id="cardExpiry" placeholder="MM/AA" maxlength="5" inputmode="numeric" autocomplete="cc-exp" />
                  <span class="form-error" id="error-cardExpiry"></span>
                </div>
                <div class="form-group">
                  <label for="cardCvv">CVV <span class="cvv-hint" title="3 o 4 dígitos al dorso de tu tarjeta">?</span></label>
                  <input type="text" id="cardCvv" placeholder="•••" maxlength="4" inputmode="numeric" autocomplete="cc-csc" />
                  <span class="form-error" id="error-cardCvv"></span>
                </div>
              </div>

              <div class="tarjetas-aceptadas">
                <span>Aceptamos:</span>
                <span class="marca visa-m">VISA</span>
                <span class="marca mc-m">MC</span>
                <span class="marca amex-m">AMEX</span>
              </div>

              <button class="btn btn--primary pasarela-pagar-btn" id="btnPagar">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Pagar ${formatPrecio(subtotal)}
              </button>
            </div>
          </div>

          <!-- Panel transferencia -->
          <div id="panelTransferencia" class="pasarela-panel">
            <div class="transferencia-info">
              <div class="transferencia-banco">
                <div class="banco-badge">🏦</div>
                <div>
                  <p class="banco-nombre">Banco Aromatizarte (Simulación)</p>
                  <p class="banco-tipo">Cuenta Corriente</p>
                </div>
              </div>
              <div class="transferencia-datos">
                <div class="tf-row"><span>Banco</span><strong>Banco Estado</strong></div>
                <div class="tf-row"><span>Tipo de cuenta</span><strong>Cuenta Corriente</strong></div>
                <div class="tf-row"><span>N° de cuenta</span><strong>00-123-45678-9</strong></div>
                <div class="tf-row"><span>RUT empresa</span><strong>76.543.210-K</strong></div>
                <div class="tf-row"><span>Nombre</span><strong>Aromatizarte SpA</strong></div>
                <div class="tf-row tf-row--total"><span>Monto a transferir</span><strong>${formatPrecio(subtotal)}</strong></div>
              </div>
              <p class="tf-nota">Una vez realizada la transferencia, envía el comprobante a <strong>pagos@aromatizarte.cl</strong> con tu nombre y número de pedido.</p>
              <button class="btn btn--primary pasarela-pagar-btn" id="btnTransferencia">
                Ya realicé la transferencia →
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Rellenar items del resumen
  const raw = state.carrito || {};
  const items = raw.items ?? [];
  document.getElementById('pasarelaItems').innerHTML = items.map(i => `
    <div class="pasarela-item">
      <span>${i.nombre} <em>×${i.cantidad}</em></span>
      <span>${formatPrecio(i.precio * i.cantidad)}</span>
    </div>
  `).join('');

  // ── Interactividad de la tarjeta visual ──────────────────
  const numInput = document.getElementById('cardNumero');
  const titInput = document.getElementById('cardTitular');
  const expInput = document.getElementById('cardExpiry');
  const brandIcon = document.getElementById('cardBrandIcon');

  // Formatear número de tarjeta (grupos de 4)
  numInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 16);
    this.value = v.replace(/(.{4})/g, '$1 ').trim();
    // Detectar red
    const first = v[0];
    let red = 'VISA', icon = '💳';
    if (first === '4') { red = 'VISA'; icon = '🔵'; }
    else if (first === '5') { red = 'MASTERCARD'; icon = '🔴'; }
    else if (first === '3') { red = 'AMEX'; icon = '🟢'; }
    document.getElementById('tarjetaRed').textContent = red;
    brandIcon.textContent = icon;
    // Actualizar visual
    const display = v.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('tarjetaNumero').textContent = display;
    limpiarError('cardNumero');
  });

  titInput.addEventListener('input', function () {
    document.getElementById('tarjetaTitular').textContent = this.value.toUpperCase() || 'NOMBRE APELLIDO';
    limpiarError('cardTitular');
  });

  // Formatear expiración MM/AA
  expInput.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    this.value = v;
    document.getElementById('tarjetaExpiry').textContent = v || 'MM/AA';
    limpiarError('cardExpiry');
  });

  document.getElementById('cardCvv').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
    limpiarError('cardCvv');
  });

  // ── Tabs metodo pago ─────────────────────────────────────
  overlay.querySelectorAll('.pasarela-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.pasarela-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const metodo = tab.dataset.metodo;
      document.getElementById('panelTarjeta').classList.toggle('active', metodo === 'tarjeta');
      document.getElementById('panelTransferencia').classList.toggle('active', metodo === 'transferencia');
    });
  });

  // ── Botón pagar con tarjeta ───────────────────────────────
  document.getElementById('btnPagar').addEventListener('click', () => {
    if (!validarTarjeta()) return;
    iniciarProcesamiento(datosEnvio, subtotal, 'tarjeta');
  });

  // ── Botón transferencia ───────────────────────────────────
  document.getElementById('btnTransferencia').addEventListener('click', () => {
    iniciarProcesamiento(datosEnvio, subtotal, 'transferencia');
  });

  // Guardar referencia al overlay para cerrarlo luego
  window._pasarelaOverlay = overlay;
}

function limpiarError(id) {
  const el = document.getElementById(`error-${id}`);
  const inp = document.getElementById(id);
  if (el) el.style.display = 'none';
  if (inp) inp.classList.remove('input-error');
}

function mostrarError(id, msg) {
  const el = document.getElementById(`error-${id}`);
  const inp = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  if (inp) inp.classList.add('input-error');
}

function validarTarjeta() {
  let ok = true;

  const num = document.getElementById('cardNumero').value.replace(/\s/g, '');
  if (num.length < 13 || num.length > 16 || !/^\d+$/.test(num)) {
    mostrarError('cardNumero', 'Ingresa un número de tarjeta válido (13-16 dígitos).');
    ok = false;
  } else { limpiarError('cardNumero'); }

  const tit = document.getElementById('cardTitular').value.trim();
  if (tit.length < 3) {
    mostrarError('cardTitular', 'Ingresa el nombre tal como aparece en tu tarjeta.');
    ok = false;
  } else { limpiarError('cardTitular'); }

  const exp = document.getElementById('cardExpiry').value;
  const expMatch = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!expMatch) {
    mostrarError('cardExpiry', 'Formato inválido. Usa MM/AA.');
    ok = false;
  } else {
    const mes = parseInt(expMatch[1]);
    const anio = parseInt('20' + expMatch[2]);
    const now = new Date();
    if (mes < 1 || mes > 12 || anio < now.getFullYear() || (anio === now.getFullYear() && mes < now.getMonth() + 1)) {
      mostrarError('cardExpiry', 'La tarjeta está vencida o la fecha es inválida.');
      ok = false;
    } else { limpiarError('cardExpiry'); }
  }

  const cvv = document.getElementById('cardCvv').value;
  if (cvv.length < 3) {
    mostrarError('cardCvv', 'CVV inválido.');
    ok = false;
  } else { limpiarError('cardCvv'); }

  return ok;
}

// ── PASO 1: Mostrar pantalla de procesamiento y simular pago ─────────────────
function iniciarProcesamiento(datosEnvio, subtotal, metodo) {
  const modal = document.getElementById('pasarelaModal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="procesando-inner">
      <div class="procesando-spinner"></div>
      <h3>Procesando tu pago…</h3>
      <p>Por favor no cierres esta ventana.</p>
    </div>
  `;

  // Simular delay de la pasarela (2.5s) y luego enviar correo antes de mostrar resultado
  setTimeout(async () => {
    const aprobado = Math.random() > 0.10;

    if (aprobado) {
      // Generar datos de la orden aquí, antes de notificar
      const now = new Date();
      const fecha = now.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
      const hora  = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const folio = 'ARO-' + Math.floor(Math.random() * 900000 + 100000);

      // Mostrar spinner de envío de correo mientras se procesa
      modal.innerHTML = `
        <div class="procesando-inner">
          <div class="procesando-spinner"></div>
          <h3>Enviando confirmación…</h3>
          <p>Estamos enviando el correo con los detalles de tu compra.</p>
        </div>
      `;

      // ── PASO 2: Enviar notificación al cliente ANTES de mostrar resultado ──
      let correoEnviado = false;
      let correoError   = '';
      try {
        const items = (state.carrito.items || []).map(i => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio: i.precio,
        }));
        await apiFetch('/api/ordenes', {
          method: 'POST',
          body: JSON.stringify({ folio, fecha, hora, metodo, datosEnvio, items, subtotal }),
        });
        correoEnviado = true;
      } catch (err) {
        console.error('Error enviando correo de orden:', err);
        correoError = err.message || 'Error al enviar el correo';
      }

      // ── PASO 3: Mostrar resultado con estado del correo ────────────────────
      mostrarResultadoPago({
        aprobado: true,
        datosEnvio,
        subtotal,
        metodo,
        folio,
        fecha,
        hora,
        correoEnviado,
        correoError,
      });

    } else {
      // Pago rechazado: no se genera orden ni correo
      mostrarResultadoPago({ aprobado: false, datosEnvio, subtotal, metodo });
    }
  }, 2500);
}

// ── PASO 3: Renderizar pantalla de resultado ──────────────────────────────────
function mostrarResultadoPago({ aprobado, datosEnvio, subtotal, metodo, folio, fecha, hora, correoEnviado, correoError }) {
  const overlay = window._pasarelaOverlay;
  const modal   = document.getElementById('pasarelaModal');
  if (!overlay || !modal) return;

  // Construir nota de correo según el resultado del envío
  let notaCorreo = '';
  if (aprobado) {
    if (correoEnviado) {
      notaCorreo = `
        <div class="resultado-correo-ok">
          <svg width="16" height="16" fill="none" stroke="#5AB584" stroke-width="2.5" viewBox="0 0 24 24"><path d="M4 4h16v16H4z" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>
          Correo de confirmación enviado a <strong>${datosEnvio.correo}</strong>
        </div>`;
    } else {
      notaCorreo = `
        <div class="resultado-correo-error">
          <svg width="16" height="16" fill="none" stroke="#E05A5A" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          No pudimos enviar el correo de confirmación. La administradora ha sido notificada y se pondrá en contacto contigo.
        </div>`;
    }
  }

  modal.innerHTML = `
    <div class="pasarela-resultado ${aprobado ? 'aprobado' : 'rechazado'}">
      <div class="resultado-icono">
        ${aprobado
          ? `<svg width="56" height="56" fill="none" stroke="#5AB584" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`
          : `<svg width="56" height="56" fill="none" stroke="#E05A5A" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`
        }
      </div>
      <h2>${aprobado ? '¡Pago aprobado!' : 'Pago rechazado'}</h2>
      <p class="resultado-sub">
        ${aprobado
          ? 'Tu compra fue procesada exitosamente.'
          : 'Tu pago no pudo ser procesado. Por favor verifica los datos o usa otro método.'}
      </p>

      ${aprobado ? `
        <div class="resultado-comprobante">
          <div class="comprobante-row"><span>N° de orden</span><strong>${folio}</strong></div>
          <div class="comprobante-row"><span>Fecha</span><strong>${fecha}, ${hora}</strong></div>
          <div class="comprobante-row"><span>Método</span><strong>${metodo === 'tarjeta' ? 'Tarjeta de crédito/débito' : 'Transferencia bancaria'}</strong></div>
          <div class="comprobante-row"><span>Destinatario</span><strong>${datosEnvio.nombre} ${datosEnvio.apellido || ''}</strong></div>
          <div class="comprobante-row"><span>Dirección de envío</span><strong>${datosEnvio.direccion}, ${datosEnvio.comuna}</strong></div>
          <div class="comprobante-row comprobante-total"><span>Total pagado</span><strong>${formatPrecio(subtotal)}</strong></div>
        </div>
        ${notaCorreo}
      ` : `
        <div class="resultado-comprobante">
          <div class="comprobante-row"><span>Motivo</span><strong>Fondos insuficientes o datos incorrectos (simulación)</strong></div>
        </div>
      `}

      <div class="resultado-acciones">
        ${aprobado
          ? `<button class="btn btn--primary" id="btnCerrarPasarela">Volver a la tienda</button>`
          : `<button class="btn btn--ghost" id="btnReintentar">← Reintentar</button>
             <button class="btn btn--primary" id="btnCerrarPasarela">Volver a la tienda</button>`
        }
      </div>
    </div>
  `;

  // Cerrar pasarela y limpiar carrito si fue aprobado
  document.getElementById('btnCerrarPasarela').addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
    window._pasarelaOverlay = null;
    if (aprobado) {
      vaciarCarrito();
      if (correoEnviado) {
        showToast(`¡Compra realizada! Revisa tu correo ${datosEnvio.correo}`, 'success');
      } else {
        showToast('¡Compra realizada! La administradora te contactará con los detalles.', 'warning');
      }
    }
  });

  document.getElementById('btnReintentar')?.addEventListener('click', () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = '';
    window._pasarelaOverlay = null;
    abrirPasarelaSimulada(datosEnvio, subtotal);
  });
}

// ── Init ────────────────────────────────────────────────────
(async function init() {
  await Promise.all([loadCategorias(), loadProductos(), loadCarrito()]);
})();