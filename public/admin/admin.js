let token = sessionStorage.getItem('admin_token');
let deleteProductId = null;
let currentEditId = null;

function authHeader() {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ---- LOGIN ----
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const password = document.getElementById('password-input').value;
  const errEl = document.getElementById('login-error');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error; return; }
    token = data.token;
    sessionStorage.setItem('admin_token', token);
    showPanel();
  } catch {
    errEl.textContent = 'Error de conexión';
  }
});

function showPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'grid';
  loadProducts();
}

document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.removeItem('admin_token');
  token = null;
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
});

if (token) showPanel();

// ---- PRODUCTS TABLE ----
async function loadProducts() {
  const wrap = document.getElementById('products-table-wrap');
  wrap.innerHTML = '<div class="loading">Cargando...</div>';
  const res = await fetch('/api/admin/products', { headers: authHeader() });
  if (res.status === 401) { sessionStorage.removeItem('admin_token'); location.reload(); return; }
  const products = await res.json();

  if (!products.length) {
    wrap.innerHTML = '<div class="loading">No hay productos aún. Crea el primero con el botón de arriba.</div>';
    return;
  }

  wrap.innerHTML = `
    <div class="products-table">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Fotos</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><strong>${p.nombre}</strong></td>
              <td><span class="badge badge-cat">${p.categoria}</span></td>
              <td>$${Number(p.precio).toLocaleString('es-CL')}</td>
              <td>${p.total_imagenes} foto(s)</td>
              <td><span class="badge ${p.disponible ? 'badge-on' : 'badge-off'}">${p.disponible ? 'Disponible' : 'Agotado'}</span></td>
              <td>
                <div class="td-actions">
                  <button class="btn-icon edit" onclick="editProduct(${p.id})">Editar</button>
                  <button class="btn-icon btn-toggle" onclick="toggleDisponible(${p.id}, ${p.disponible})">${p.disponible ? 'Marcar Agotado' : 'Marcar Disponible'}</button>
                  <button class="btn-icon delete" onclick="confirmDelete(${p.id})">Eliminar</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---- MODAL PRODUCTO ----
document.getElementById('btn-nuevo').addEventListener('click', () => openProductModal(null));
document.getElementById('modal-close').addEventListener('click', closeProductModal);
document.getElementById('btn-cancel').addEventListener('click', closeProductModal);
document.getElementById('product-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('product-modal')) closeProductModal();
});

function openProductModal(product) {
  currentEditId = product ? product.id : null;
  document.getElementById('modal-title').textContent = product ? 'Editar Fardo' : 'Nuevo Fardo';
  document.getElementById('product-id').value = product ? product.id : '';
  document.getElementById('f-nombre').value = product ? product.nombre : '';
  document.getElementById('f-categoria').value = product ? product.categoria : '';
  document.getElementById('f-precio').value = product ? product.precio : '';
  document.getElementById('f-calidad').value = product ? (product.calidad || '') : '';
  document.getElementById('f-kilos').value = product ? (product.kilos || '') : '';
  document.getElementById('f-prendas').value = product ? (product.cantidad_prendas || '') : '';
  document.getElementById('f-descripcion').value = product ? (product.descripcion || '') : '';
  document.getElementById('f-disponible').checked = product ? Boolean(product.disponible) : true;

  const imagesSection = document.getElementById('images-section');
  if (product) {
    imagesSection.style.display = 'block';
    loadThumbnail(product.id);
    loadImages(product.id);
    loadVideos(product.id);
  } else {
    imagesSection.style.display = 'none';
  }

  document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
  currentEditId = null;
}

async function editProduct(id) {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) {
    const res2 = await fetch(`/api/admin/products`, { headers: authHeader() });
    const all = await res2.json();
    const p = all.find(x => x.id === id);
    openProductModal(p);
    return;
  }
  const p = await res.json();
  openProductModal(p);
}

document.getElementById('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const body = {
    nombre: document.getElementById('f-nombre').value,
    categoria: document.getElementById('f-categoria').value,
    precio: document.getElementById('f-precio').value,
    calidad: document.getElementById('f-calidad').value,
    kilos: document.getElementById('f-kilos').value,
    cantidad_prendas: document.getElementById('f-prendas').value,
    descripcion: document.getElementById('f-descripcion').value,
    disponible: document.getElementById('f-disponible').checked
  };

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    let res;
    if (id) {
      res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT', headers: authHeader(), body: JSON.stringify(body)
      });
    } else {
      res = await fetch('/api/admin/products', {
        method: 'POST', headers: authHeader(), body: JSON.stringify(body)
      });
    }
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }

    if (!id) {
      currentEditId = data.id;
      document.getElementById('product-id').value = data.id;
      document.getElementById('modal-title').textContent = 'Editar Fardo';
      document.getElementById('images-section').style.display = 'block';
      loadThumbnail(data.id);
      loadImages(data.id);
      loadVideos(data.id);
    }
    loadProducts();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

// ---- MINIATURA ----
document.getElementById('thumb-upload').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file || !currentEditId) return;
  const formData = new FormData();
  formData.append('thumbnail', file);
  const btn = document.getElementById('thumb-upload-btn');
  btn.style.opacity = '0.6';
  try {
    const res = await fetch(`/api/admin/products/${currentEditId}/thumbnail`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (res.ok) { loadThumbnail(currentEditId); loadProducts(); }
    else { const d = await res.json(); alert(d.error); }
  } finally {
    btn.style.opacity = '1';
    e.target.value = '';
  }
});

async function loadThumbnail(productId) {
  const preview = document.getElementById('thumb-preview');
  const res = await fetch(`/api/admin/products`, { headers: authHeader() });
  const all = await res.json();
  const p = all.find(x => x.id === productId);
  if (p?.thumbnail_filename) {
    preview.innerHTML = `
      <div class="thumb-box">
        <img src="/uploads/${p.thumbnail_filename}" alt="miniatura">
        <div class="thumb-box-info">
          <span>Miniatura actual del catálogo</span>
          <button class="btn-remove-thumb" onclick="removeThumbnail(${productId})">✕ Eliminar miniatura</button>
        </div>
      </div>`;
  } else {
    preview.innerHTML = '<div class="no-thumb">Sin miniatura — se mostrará un ícono de caja en el catálogo.</div>';
  }
}

async function removeThumbnail(productId) {
  await fetch(`/api/admin/products/${productId}/thumbnail`, { method: 'DELETE', headers: authHeader() });
  loadThumbnail(productId);
  loadProducts();
}

// ---- IMÁGENES ----
async function loadImages(productId) {
  const grid = document.getElementById('images-grid');
  const res = await fetch(`/api/products/${productId}`);
  const p = await res.json();
  if (!p.images || !p.images.length) {
    grid.innerHTML = '<div class="no-images">No hay fotos aún. Sube imágenes de referencia del fardo.</div>';
    return;
  }
  grid.innerHTML = p.images.map(img => `
    <div class="img-item" id="img-${img.id}">
      <img src="/uploads/${img.filename}" alt="foto">
      <button class="img-delete" onclick="deleteImage(${img.id})" title="Eliminar foto">&times;</button>
    </div>
  `).join('');
}

document.getElementById('vid-upload').addEventListener('change', async e => {
  const files = e.target.files;
  if (!files.length || !currentEditId) return;
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('videos', f));
  const btn = document.querySelectorAll('.btn-upload')[1];
  btn.style.opacity = '0.6';
  try {
    const res = await fetch(`/api/admin/products/${currentEditId}/videos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (res.ok) { loadVideos(currentEditId); loadProducts(); }
    else { const d = await res.json(); alert(d.error); }
  } finally {
    btn.style.opacity = '1';
    e.target.value = '';
  }
});

async function loadVideos(productId) {
  const grid = document.getElementById('videos-grid');
  const res = await fetch(`/api/products/${productId}`);
  const p = await res.json();
  if (!p.videos || !p.videos.length) {
    grid.innerHTML = '<div class="no-videos">No hay videos aún.</div>';
    return;
  }
  grid.innerHTML = p.videos.map(v => `
    <div class="vid-item" id="vid-${v.id}">
      <video controls preload="metadata">
        <source src="/uploads/${v.filename}">
      </video>
      <button class="vid-delete" onclick="deleteVideo(${v.id})" title="Eliminar video">&times;</button>
    </div>
  `).join('');
}

async function deleteVideo(vidId) {
  if (!confirm('¿Eliminar este video?')) return;
  await fetch(`/api/admin/videos/${vidId}`, { method: 'DELETE', headers: authHeader() });
  loadVideos(currentEditId);
  loadProducts();
}

document.getElementById('img-upload').addEventListener('change', async e => {
  const files = e.target.files;
  if (!files.length || !currentEditId) return;
  const formData = new FormData();
  Array.from(files).forEach(f => formData.append('images', f));
  const btn = document.querySelector('.btn-upload');
  btn.style.opacity = '0.6';
  try {
    const res = await fetch(`/api/admin/products/${currentEditId}/images`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (res.ok) { loadImages(currentEditId); loadProducts(); }
    else { const d = await res.json(); alert(d.error); }
  } finally {
    btn.style.opacity = '1';
    e.target.value = '';
  }
});

async function deleteImage(imgId) {
  if (!confirm('¿Eliminar esta foto?')) return;
  await fetch(`/api/admin/images/${imgId}`, { method: 'DELETE', headers: authHeader() });
  loadImages(currentEditId);
  loadProducts();
}

// ---- TOGGLE DISPONIBLE ----
async function toggleDisponible(id, current) {
  await fetch(`/api/admin/products/${id}/disponible`, {
    method: 'PATCH',
    headers: authHeader(),
    body: JSON.stringify({ disponible: !current })
  });
  loadProducts();
}

// ---- ELIMINAR ----
function confirmDelete(id) {
  deleteProductId = id;
  document.getElementById('confirm-modal').style.display = 'flex';
}
document.getElementById('confirm-no').addEventListener('click', () => {
  document.getElementById('confirm-modal').style.display = 'none';
  deleteProductId = null;
});
document.getElementById('confirm-yes').addEventListener('click', async () => {
  document.getElementById('confirm-modal').style.display = 'none';
  await fetch(`/api/admin/products/${deleteProductId}`, { method: 'DELETE', headers: authHeader() });
  deleteProductId = null;
  loadProducts();
});
