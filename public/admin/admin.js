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

// ---- MINIATURA CON RECORTADOR ----
let cropper = null;

document.getElementById('thumb-upload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file || !currentEditId) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('crop-image');
    img.src = ev.target.result;
    document.getElementById('crop-modal').style.display = 'flex';
    if (cropper) { cropper.destroy(); cropper = null; }
    cropper = new Cropper(img, {
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

function closeCropModal() {
  document.getElementById('crop-modal').style.display = 'none';
  if (cropper) { cropper.destroy(); cropper = null; }
}

document.getElementById('crop-close').addEventListener('click', closeCropModal);
document.getElementById('crop-cancel').addEventListener('click', closeCropModal);

document.getElementById('crop-save').addEventListener('click', async () => {
  if (!cropper || !currentEditId) return;
  const btn = document.getElementById('crop-save');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    const canvas = cropper.getCroppedCanvas({ maxWidth: 1200, maxHeight: 1200 });
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const formData = new FormData();
    formData.append('thumbnail', blob, 'thumbnail.jpg');
    const res = await fetch(`/api/admin/products/${currentEditId}/thumbnail`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (res.ok) {
      closeCropModal();
      loadThumbnail(currentEditId);
      loadProducts();
    } else {
      const d = await res.json();
      alert(d.error);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar miniatura';
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
    <div class="vid-wrapper" id="vid-${v.id}">
      <div class="vid-item">
        <video controls preload="metadata" ${v.poster_filename ? `poster="/uploads/${v.poster_filename}"` : ''}>
          <source src="/uploads/${v.filename}">
        </video>
        <button class="vid-delete" onclick="deleteVideo(${v.id})" title="Eliminar video">&times;</button>
      </div>
      <div class="vid-actions">
        <button class="vid-action-btn" onclick="openFrameCapture('/uploads/${v.filename}', 'thumbnail')" title="Capturar miniatura del catálogo">📷 Miniatura</button>
        <button class="vid-action-btn vid-action-poster" onclick="openFrameCapture('/uploads/${v.filename}', 'poster', ${v.id})" title="Cambiar portada del video">🎬 Portada</button>
      </div>
    </div>
  `).join('');
}

// ---- CAPTURA DE FRAME ----
let capturedBlob = null;
let frameCaptureMode = 'thumbnail';
let frameCaptureVideoId = null;

function openFrameCapture(videoSrc, mode = 'thumbnail', videoId = null) {
  capturedBlob = null;
  frameCaptureMode = mode;
  frameCaptureVideoId = videoId;

  const modal = document.getElementById('frame-modal');
  const video = document.getElementById('frame-video');
  const previewWrap = document.getElementById('frame-preview-wrap');
  const saveBtn = document.getElementById('frame-save');
  const title = modal.querySelector('h3');

  video.src = videoSrc;
  previewWrap.style.display = 'none';
  saveBtn.disabled = true;
  saveBtn.textContent = mode === 'poster' ? 'Usar como portada del video' : 'Usar como miniatura del catálogo';
  title.textContent = mode === 'poster' ? 'Cambiar portada del video' : 'Capturar miniatura del catálogo';
  modal.style.display = 'flex';
}

function closeFrameModal() {
  document.getElementById('frame-modal').style.display = 'none';
  const video = document.getElementById('frame-video');
  video.pause();
  video.src = '';
  capturedBlob = null;
}

document.getElementById('frame-close').addEventListener('click', closeFrameModal);
document.getElementById('frame-cancel').addEventListener('click', closeFrameModal);

document.getElementById('frame-capture').addEventListener('click', () => {
  const video = document.getElementById('frame-video');
  const canvas = document.getElementById('frame-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    capturedBlob = blob;
    const url = URL.createObjectURL(blob);
    const previewImg = document.getElementById('frame-preview-img');
    previewImg.src = url;
    document.getElementById('frame-preview-wrap').style.display = 'block';
    document.getElementById('frame-save').disabled = false;
  }, 'image/jpeg', 0.92);
});

document.getElementById('frame-save').addEventListener('click', async () => {
  if (!capturedBlob) return;
  const saveBtn = document.getElementById('frame-save');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';
  try {
    let res;
    if (frameCaptureMode === 'poster' && frameCaptureVideoId) {
      const formData = new FormData();
      formData.append('poster', capturedBlob, 'poster.jpg');
      res = await fetch(`/api/admin/videos/${frameCaptureVideoId}/poster`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        closeFrameModal();
        loadVideos(currentEditId);
      }
    } else {
      const formData = new FormData();
      formData.append('thumbnail', capturedBlob, 'portada.jpg');
      res = await fetch(`/api/admin/products/${currentEditId}/thumbnail`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        closeFrameModal();
        loadThumbnail(currentEditId);
        loadProducts();
      }
    }
    if (!res.ok) { const d = await res.json(); alert(d.error); }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
});

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

// ---- NAVEGACIÓN SIDEBAR ----
function showSection(active) {
  const allNavs = ['nav-products', 'nav-shipping', 'nav-warranty'];
  const allSections = ['products-table-wrap', 'shipping-section', 'warranty-section'];
  allNavs.forEach(id => document.getElementById(id).classList.remove('active'));
  allSections.forEach(id => { document.getElementById(id).style.display = 'none'; });
  document.querySelector('.main-header').style.display = active === 'products' ? '' : 'none';
  document.getElementById('nav-' + active).classList.add('active');
  document.getElementById(active === 'products' ? 'products-table-wrap' : active + '-section').style.display = '';
}

document.getElementById('nav-products').addEventListener('click', e => { e.preventDefault(); showSection('products'); });
document.getElementById('nav-shipping').addEventListener('click', e => { e.preventDefault(); showSection('shipping'); loadShippingEditor(); });
document.getElementById('nav-warranty').addEventListener('click', e => { e.preventDefault(); showSection('warranty'); loadWarrantyEditor(); });
document.getElementById('nav-appearance').addEventListener('click', e => { e.preventDefault(); showSection('appearance'); loadAppearance(); });

// ---- APARIENCIA ADMIN ----
async function loadAppearance() {
  const res = await fetch('/api/logo-size');
  const data = await res.json();
  const slider = document.getElementById('logo-size-slider');
  slider.value = data.size;
  document.getElementById('logo-size-display').textContent = data.size + 'px';
}

document.getElementById('logo-size-slider').addEventListener('input', e => {
  document.getElementById('logo-size-display').textContent = e.target.value + 'px';
  document.getElementById('appearance-logo-preview').querySelector('img').style.height = e.target.value * 0.6 + 'px';
});

document.getElementById('btn-save-logo-size').addEventListener('click', async () => {
  const size = document.getElementById('logo-size-slider').value;
  const btn = document.getElementById('btn-save-logo-size');
  const msg = document.getElementById('logo-size-msg');
  btn.disabled = true; btn.textContent = 'Guardando...';
  const res = await fetch('/api/admin/logo-size', {
    method: 'PUT', headers: authHeader(), body: JSON.stringify({ size: Number(size) })
  });
  btn.disabled = false; btn.textContent = 'Guardar tamaño';
  if (res.ok) { msg.textContent = '✓ Guardado'; msg.style.color = '#166534'; setTimeout(() => msg.textContent = '', 3000); }
  else { msg.textContent = '✗ Error'; msg.style.color = '#dc2626'; }
});

document.getElementById('logo-file-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('logo', file);
  const msg = document.getElementById('logo-upload-msg');
  msg.textContent = 'Subiendo...'; msg.style.color = '#666';
  const res = await fetch('/api/admin/logo', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
  if (res.ok) {
    msg.textContent = '✓ Logo actualizado'; msg.style.color = '#166534';
    document.getElementById('appearance-logo-img').src = '/logo.png?t=' + Date.now();
    setTimeout(() => msg.textContent = '', 3000);
  } else { msg.textContent = '✗ Error al subir'; msg.style.color = '#dc2626'; }
  e.target.value = '';
});

// ---- ENVÍOS ADMIN ----
async function loadShippingEditor() {
  const res = await fetch('/api/shipping');
  const data = await res.json();
  document.getElementById('shipping-editor').value = data.text || '';
}

async function loadWarrantyEditor() {
  const res = await fetch('/api/warranty');
  const data = await res.json();
  document.getElementById('warranty-editor').value = data.text || '';
}

document.getElementById('btn-save-warranty').addEventListener('click', async () => {
  const text = document.getElementById('warranty-editor').value;
  const btn = document.getElementById('btn-save-warranty');
  const msg = document.getElementById('warranty-save-msg');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  const res = await fetch('/api/admin/warranty', {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ text })
  });
  btn.disabled = false;
  btn.textContent = 'Guardar cambios';
  if (res.ok) {
    msg.textContent = '✓ Guardado';
    msg.style.color = '#166534';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } else {
    msg.textContent = '✗ Error al guardar';
    msg.style.color = '#dc2626';
  }
});

document.getElementById('btn-save-shipping').addEventListener('click', async () => {
  const text = document.getElementById('shipping-editor').value;
  const btn = document.getElementById('btn-save-shipping');
  const msg = document.getElementById('shipping-save-msg');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  const res = await fetch('/api/admin/shipping', {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({ text })
  });
  btn.disabled = false;
  btn.textContent = 'Guardar cambios';
  if (res.ok) {
    msg.textContent = '✓ Guardado';
    msg.style.color = '#166534';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } else {
    msg.textContent = '✗ Error al guardar';
    msg.style.color = '#dc2626';
  }
});
