const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) return { products: [], images: [], videos: [], nextProductId: 1, nextImageId: 1, nextVideoId: 1 };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.videos) { data.videos = []; data.nextVideoId = 1; }
  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

if (!fs.existsSync(DB_FILE)) {
  writeDB({
    nextProductId: 4, nextImageId: 1, nextVideoId: 1,
    products: [
      { id: 1, nombre: 'Fardo Premium Invierno', categoria: 'Ropa de Abrigo', precio: 35000, descripcion: 'Fardo de ropa de invierno americana de primera calidad.', disponible: true, created_at: new Date().toISOString() },
      { id: 2, nombre: 'Fardo Mixto Verano', categoria: 'Mixto', precio: 25000, descripcion: 'Fardo mixto con ropa de temporada.', disponible: true, created_at: new Date().toISOString() },
      { id: 3, nombre: 'Fardo Calzado Variado', categoria: 'Calzado', precio: 40000, descripcion: 'Fardo exclusivo de calzado americano.', disponible: true, created_at: new Date().toISOString() }
    ],
    images: [],
    videos: []
  });
}

const db = {
  getProducts(onlyAvailable = false) {
    const data = readDB();
    let products = onlyAvailable ? data.products.filter(p => p.disponible) : data.products;
    return products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(p => ({
      ...p,
      total_imagenes: data.images.filter(i => i.product_id === p.id).length,
      total_videos: data.videos.filter(v => v.product_id === p.id).length
    }));
  },
  getProduct(id) {
    const data = readDB();
    const product = data.products.find(p => p.id === id);
    if (!product) return null;
    return {
      ...product,
      images: data.images.filter(i => i.product_id === id).sort((a, b) => a.orden - b.orden),
      videos: data.videos.filter(v => v.product_id === id).sort((a, b) => a.orden - b.orden)
    };
  },
  createProduct(fields) {
    const data = readDB();
    const product = { id: data.nextProductId++, ...fields, thumbnail_filename: null, created_at: new Date().toISOString() };
    data.products.push(product);
    writeDB(data);
    return product;
  },
  updateProduct(id, fields) {
    const data = readDB();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    data.products[idx] = { ...data.products[idx], ...fields };
    writeDB(data);
    return true;
  },
  setThumbnailFile(productId, filename) {
    const data = readDB();
    const idx = data.products.findIndex(p => p.id === productId);
    if (idx === -1) return null;
    const old = data.products[idx].thumbnail_filename;
    data.products[idx].thumbnail_filename = filename;
    writeDB(data);
    return old;
  },
  removeThumbnail(productId) {
    const data = readDB();
    const idx = data.products.findIndex(p => p.id === productId);
    if (idx === -1) return null;
    const old = data.products[idx].thumbnail_filename;
    data.products[idx].thumbnail_filename = null;
    writeDB(data);
    return old;
  },
  deleteProduct(id) {
    const data = readDB();
    const images = data.images.filter(i => i.product_id === id);
    const videos = data.videos.filter(v => v.product_id === id);
    const product = data.products.find(p => p.id === id);
    data.products = data.products.filter(p => p.id !== id);
    data.images = data.images.filter(i => i.product_id !== id);
    data.videos = data.videos.filter(v => v.product_id !== id);
    writeDB(data);
    const allFiles = [...images, ...videos];
    if (product?.thumbnail_filename) allFiles.push({ filename: product.thumbnail_filename });
    return allFiles;
  },
  addImage(productId, filename) {
    const data = readDB();
    const maxOrden = data.images.filter(i => i.product_id === productId).reduce((m, i) => Math.max(m, i.orden), 0);
    const img = { id: data.nextImageId++, product_id: productId, filename, orden: maxOrden + 1 };
    data.images.push(img);
    writeDB(data);
    return img;
  },
  deleteImage(imgId) {
    const data = readDB();
    const img = data.images.find(i => i.id === imgId);
    if (!img) return null;
    data.images = data.images.filter(i => i.id !== imgId);
    writeDB(data);
    return img;
  },
  addVideo(productId, filename) {
    const data = readDB();
    const maxOrden = data.videos.filter(v => v.product_id === productId).reduce((m, v) => Math.max(m, v.orden), 0);
    const vid = { id: data.nextVideoId++, product_id: productId, filename, orden: maxOrden + 1 };
    data.videos.push(vid);
    writeDB(data);
    return vid;
  },
  deleteVideo(vidId) {
    const data = readDB();
    const vid = data.videos.find(v => v.id === vidId);
    if (!vid) return null;
    data.videos = data.videos.filter(v => v.id !== vidId);
    writeDB(data);
    return vid;
  }
};

module.exports = db;
