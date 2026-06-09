const WA_NUMBER = '56949769400';
let allProducts = [];
let currentCategory = 'Todos';

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  try {
    const res = await fetch('/api/products');
    allProducts = await res.json();
    buildFilters();
    renderProducts(allProducts);
  } catch {
    grid.innerHTML = '<div class="loading">Error al cargar productos. Intenta nuevamente.</div>';
  }
}

function buildFilters() {
  const filtros = document.getElementById('filtros');
  const cats = ['Todos', ...new Set(allProducts.map(p => p.categoria))];
  filtros.innerHTML = cats.map(c =>
    `<button class="filtro-btn ${c === 'Todos' ? 'active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  filtros.addEventListener('click', e => {
    const btn = e.target.closest('.filtro-btn');
    if (!btn) return;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    const filtered = currentCategory === 'Todos' ? allProducts : allProducts.filter(p => p.categoria === currentCategory);
    renderProducts(filtered);
  });
}

function formatPrecio(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!products.length) {
    grid.innerHTML = '<div class="empty">No hay productos disponibles en esta categoría.</div>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card ${p.disponible ? '' : 'card-agotado'}" data-id="${p.id}">
      <div class="card-img-wrap">
        ${p.thumbnail_filename
          ? `<img class="card-img" src="/uploads/${p.thumbnail_filename}" alt="${p.nombre}" loading="lazy">`
          : `<div class="card-img-placeholder">📦</div>`}
        ${!p.disponible ? `<div class="badge-agotado">AGOTADO</div>` : ''}
      </div>
      <div class="card-body">
        <span class="card-cat">${p.categoria}</span>
        <div class="card-name">${p.nombre}</div>
        <div class="card-specs">
          ${p.calidad ? `<span class="spec-item spec-calidad spec-calidad--${p.calidad.toLowerCase()}">★ ${p.calidad}</span>` : ''}
          ${p.kilos ? `<span class="spec-item">⚖️ ${p.kilos} kg</span>` : ''}
          ${p.cantidad_prendas ? `<span class="spec-item">👕 ~${p.cantidad_prendas} prendas</span>` : ''}
        </div>
        <div class="card-desc">${p.descripcion || ''}</div>
        <div class="card-footer">
          <span class="card-precio">${formatPrecio(p.precio)}</span>
          ${p.disponible
            ? `<a href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, estoy interesado en el fardo: ' + p.nombre)}"
                 target="_blank" class="card-wa" onclick="event.stopPropagation()">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>`
            : `<span class="card-agotado-tag">Sin stock</span>`}
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => openModal(Number(card.dataset.id)));
  });
}

let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = images[index];
  lb.style.display = 'flex';
  document.getElementById('lightbox-prev').style.display = images.length > 1 ? '' : 'none';
  document.getElementById('lightbox-next').style.display = images.length > 1 ? '' : 'none';
}

document.getElementById('lightbox-close').addEventListener('click', () => {
  document.getElementById('lightbox').style.display = 'none';
});
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) document.getElementById('lightbox').style.display = 'none';
});
document.getElementById('lightbox-prev').addEventListener('click', e => {
  e.stopPropagation();
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  document.getElementById('lightbox-img').src = lightboxImages[lightboxIndex];
});
document.getElementById('lightbox-next').addEventListener('click', e => {
  e.stopPropagation();
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  document.getElementById('lightbox-img').src = lightboxImages[lightboxIndex];
});
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (lb.style.display !== 'none') {
    if (e.key === 'ArrowLeft') document.getElementById('lightbox-prev').click();
    if (e.key === 'ArrowRight') document.getElementById('lightbox-next').click();
    if (e.key === 'Escape') lb.style.display = 'none';
  }
});

async function openModal(id) {
  const res = await fetch(`/api/products/${id}`);
  const p = await res.json();

  document.getElementById('modal-cat').textContent = p.categoria;
  document.getElementById('modal-nombre').textContent = p.nombre;

  const specsEl = document.getElementById('modal-specs');
  const specs = [];
  if (p.calidad) specs.push(`<span class="modal-spec-item modal-spec-calidad modal-spec-calidad--${p.calidad.toLowerCase()}">★ ${p.calidad}</span>`);
  if (p.kilos) specs.push(`<span class="modal-spec-item">⚖️ <strong>${p.kilos} kg</strong></span>`);
  if (p.cantidad_prendas) specs.push(`<span class="modal-spec-item">👕 <strong>~${p.cantidad_prendas} prendas</strong></span>`);
  specsEl.innerHTML = specs.join('');
  specsEl.style.display = specs.length ? 'flex' : 'none';

  document.getElementById('modal-desc').textContent = p.descripcion || '';
  document.getElementById('modal-precio').textContent = formatPrecio(p.precio);

  const modalWa = document.getElementById('modal-wa');
  if (p.disponible) {
    modalWa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, estoy interesado en el fardo: ' + p.nombre)}`;
    modalWa.style.display = '';
    document.getElementById('modal-agotado-msg').style.display = 'none';
  } else {
    modalWa.style.display = 'none';
    document.getElementById('modal-agotado-msg').style.display = 'flex';
  }

  const hasImages = p.images && p.images.length > 0;
  const hasVideos = p.videos && p.videos.length > 0;
  const gallery = document.getElementById('modal-gallery');
  const videosSection = document.getElementById('modal-videos');
  const videosList = document.getElementById('videos-list');
  const photosStrip = document.getElementById('modal-photos-strip');
  const modalBox = document.querySelector('.modal-box');

  if (hasVideos && hasImages) {
    // Video a la izquierda, fotos en strip a la derecha
    modalBox.classList.add('modal-video-layout');
    const imgUrls = p.images.map(img => `/uploads/${img.filename}`);

    gallery.innerHTML = `
      <div class="gallery-video-main">
        <video controls preload="metadata" playsinline>
          <source src="/uploads/${p.videos[0].filename}">
        </video>
        ${p.videos.length > 1 ? `<div class="gallery-thumbs gallery-vid-thumbs">
          ${p.videos.map((v, i) => `
            <div class="gallery-vid-thumb ${i === 0 ? 'active' : ''}" data-src="/uploads/${v.filename}">▶ ${i+1}</div>
          `).join('')}
        </div>` : ''}
      </div>
    `;
    gallery.querySelectorAll('.gallery-vid-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        gallery.querySelector('video source').src = thumb.dataset.src;
        gallery.querySelector('video').load();
        gallery.querySelectorAll('.gallery-vid-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    photosStrip.style.display = 'block';
    photosStrip.innerHTML = `
      <div class="strip-label">Fotos del fardo</div>
      <div class="strip-thumbs">
        ${imgUrls.map((src, i) => `
          <img class="strip-thumb" src="${src}" data-index="${i}" alt="foto ${i+1}">
        `).join('')}
      </div>
    `;
    photosStrip.querySelectorAll('.strip-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => openLightbox(imgUrls, Number(thumb.dataset.index)));
    });

    videosSection.style.display = 'none';
    videosList.innerHTML = '';

  } else if (hasImages) {
    // Solo fotos — layout clásico
    modalBox.classList.remove('modal-video-layout');
    photosStrip.style.display = 'none';
    const imgUrls = p.images.map(img => `/uploads/${img.filename}`);

    gallery.innerHTML = `
      <img class="gallery-main" id="gallery-main-img" src="${imgUrls[0]}" alt="${p.nombre}" style="cursor:zoom-in">
      ${imgUrls.length > 1 ? `<div class="gallery-thumbs">
        ${imgUrls.map((src, i) => `
          <img class="gallery-thumb ${i === 0 ? 'active' : ''}" src="${src}" data-src="${src}" data-index="${i}" alt="foto ${i+1}">
        `).join('')}
      </div>` : ''}
    `;
    const mainImg = document.getElementById('gallery-main-img');
    mainImg.addEventListener('click', () => openLightbox(imgUrls, imgUrls.indexOf(mainImg.src.replace(location.origin, ''))));
    gallery.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        mainImg.src = thumb.dataset.src;
        gallery.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    if (hasVideos) {
      videosList.innerHTML = p.videos.map(v => `
        <div class="video-item">
          <video controls preload="metadata"><source src="/uploads/${v.filename}"></video>
        </div>
      `).join('');
      videosSection.style.display = 'block';
    } else {
      videosSection.style.display = 'none';
      videosList.innerHTML = '';
    }

  } else if (hasVideos) {
    // Solo video — video a la izquierda
    modalBox.classList.remove('modal-video-layout');
    photosStrip.style.display = 'none';
    gallery.innerHTML = `
      <div class="gallery-video-main">
        <video controls preload="metadata" playsinline>
          <source src="/uploads/${p.videos[0].filename}">
        </video>
      </div>
    `;
    videosSection.style.display = 'none';
    videosList.innerHTML = '';

  } else {
    modalBox.classList.remove('modal-video-layout');
    photosStrip.style.display = 'none';
    gallery.innerHTML = '<div class="gallery-no-img">📦</div>';
    videosSection.style.display = 'none';
    videosList.innerHTML = '';
  }

  document.getElementById('modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('lightbox').style.display !== 'none') return;
    closeModal();
  }
});

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.body.style.overflow = '';
}

loadProducts();
