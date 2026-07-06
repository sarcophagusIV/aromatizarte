document.addEventListener('DOMContentLoaded', () => {
  const loginBox = document.getElementById('login-box');
  const adminArea = document.getElementById('admin-area');
  const loginForm = document.getElementById('login-form');
  const loginMsg = document.getElementById('login-msg');
  const logoutBtn = document.getElementById('logout');
  const productosList = document.getElementById('productos-list');
  const createForm = document.getElementById('create-form');
  const createMsg = document.getElementById('create-msg');

  function token() { return localStorage.getItem('token') }
  function authHeader() { return { 'Authorization': 'Bearer ' + token(), 'Content-Type': 'application/json' } }

  if (token()) showAdmin();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!r.ok) throw await r.json();
      const data = await r.json();
      localStorage.setItem('token', data.token);
      showAdmin();
    } catch (err) { loginMsg.textContent = err.error || 'Error de login' }
  });

  logoutBtn.addEventListener('click', () => { localStorage.removeItem('token'); location.reload(); });

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault(); createMsg.textContent = '';
    const body = {
      nombre: document.getElementById('c-nombre').value,
      slug: document.getElementById('c-slug').value,
      precio: parseFloat(document.getElementById('c-precio').value),
      stock: parseInt(document.getElementById('c-stock').value) || 0,
      categoria_id: parseInt(document.getElementById('c-categoria').value) || null,
      imagen_url: document.getElementById('c-imagen').value,
      destacado: document.getElementById('c-destacado').checked,
      descripcion: document.getElementById('c-descripcion').value
    };
    try {
      const r = await fetch('/api/productos/admin', { method: 'POST', headers: authHeader(), body: JSON.stringify(body) });
      if (!r.ok) throw await r.json();
      const p = await r.json();
      createMsg.textContent = 'Creado: ' + p.nombre;
      createForm.reset();
      loadProducts();
    } catch (err) { createMsg.textContent = err.error || 'Error al crear' }
  });

  async function showAdmin() { loginBox.style.display = 'none'; adminArea.style.display = 'block'; await loadProducts(); }

  async function loadProducts() {
    productosList.innerHTML = 'Cargando...';
    try {
      const r = await fetch('/api/productos?limite=100');
      const data = await r.json();
      const list = data.productos || data;
      if (!list.length) productosList.innerHTML = '<em>No hay productos</em>';
      productosList.innerHTML = '';
      list.forEach(p => {
        const el = document.createElement('div'); el.className = 'producto';
        el.innerHTML = `
          <div class="meta">
            <strong>${escapeHtml(p.nombre)}</strong> <small>(${p.slug})</small>
            <div>${escapeHtml(p.descripcion || '')}</div>
            <div>Precio: <span class="precio">${p.precio}</span></div>
          </div>
          <div>
            <input type="number" class="stock-input" value="${p.stock || 0}">
            <div style="margin-top:6px">
              <button class="btn-edit">Editar</button>
              <button class="btn-save" style="display:none">Guardar</button>
              <button class="btn-delete">Eliminar</button>
              <button class="btn-update-stock">Actualizar stock</button>
            </div>
          </div>
        `;
        // Handlers
        const btnDelete = el.querySelector('.btn-delete');
        btnDelete.addEventListener('click', () => deleteProduct(p.id));
        const btnUpdateStock = el.querySelector('.btn-update-stock');
        btnUpdateStock.addEventListener('click', () => updateStock(p.id, el.querySelector('.stock-input').value));
        const btnEdit = el.querySelector('.btn-edit');
        const btnSave = el.querySelector('.btn-save');
        btnEdit.addEventListener('click', () => enterEdit(el, p, btnEdit, btnSave));
        btnSave.addEventListener('click', () => saveEdit(el, p.id, btnEdit, btnSave));

        productosList.appendChild(el);
      });
    } catch (err) { productosList.innerHTML = 'Error cargando productos' }
  }

  function enterEdit(el, p, btnEdit, btnSave) {
    btnEdit.style.display = 'none'; btnSave.style.display = 'inline-block';
    const meta = el.querySelector('.meta');
    meta.innerHTML = `
      <input class="e-nombre" value="${escapeHtml(p.nombre)}">
      <input class="e-slug" value="${escapeHtml(p.slug)}">
      <textarea class="e-descripcion">${escapeHtml(p.descripcion || '')}</textarea>
      <input class="e-precio" type="number" value="${p.precio}">
    `;
  }

  async function saveEdit(el, id, btnEdit, btnSave) {
    const nombre = el.querySelector('.e-nombre').value;
    const slug = el.querySelector('.e-slug').value;
    const descripcion = el.querySelector('.e-descripcion').value;
    const precio = parseFloat(el.querySelector('.e-precio').value) || 0;
    try {
      const r = await fetch('/api/productos/admin/' + id, { method: 'PUT', headers: authHeader(), body: JSON.stringify({ nombre, slug, descripcion, precio }) });
      if (!r.ok) throw await r.json();
      btnSave.style.display = 'none'; btnEdit.style.display = 'inline-block';
      loadProducts();
    } catch (err) { alert(err.error || 'Error guardando') }
  }

  async function deleteProduct(id) { if (!confirm('Eliminar producto?')) return; try { const r = await fetch('/api/productos/admin/' + id, { method: 'DELETE', headers: authHeader() }); if (!r.ok) throw await r.json(); await loadProducts(); } catch (err) { alert(err.error || 'Error eliminando') } }

  async function updateStock(id, s) { try { const r = await fetch('/api/productos/admin/' + id + '/stock', { method: 'PATCH', headers: authHeader(), body: JSON.stringify({ stock: parseInt(s) }) }); if (!r.ok) throw await r.json(); loadProducts(); } catch (err) { alert(err.error || 'Error stock') } }

  // util
  function escapeHtml(s) { return String(s || '').replace(/[&"'<]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', "'": '&#39;' }[c])); }
});