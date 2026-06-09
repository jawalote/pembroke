require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pembroke-secret-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pembroke2024';

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadVideo = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Solo se permiten videos'));
  },
  limits: { fileSize: 200 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  try {
    jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// --- API PÚBLICA ---

app.get('/api/products', (req, res) => {
  res.json(db.getProducts(false));
});

app.get('/api/products/:id', (req, res) => {
  const product = db.getProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(product);
});

// --- API ADMIN ---

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.get('/api/admin/products', authMiddleware, (req, res) => {
  res.json(db.getProducts(false));
});

app.post('/api/admin/products', authMiddleware, (req, res) => {
  const { nombre, categoria, precio, descripcion, kilos, cantidad_prendas, calidad, disponible } = req.body;
  if (!nombre || !categoria || !precio) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const product = db.createProduct({
    nombre, categoria, precio: Number(precio),
    descripcion: descripcion || '',
    kilos: kilos ? Number(kilos) : null,
    cantidad_prendas: cantidad_prendas || null,
    calidad: calidad || null,
    disponible: !!disponible
  });
  res.json({ id: product.id, message: 'Producto creado' });
});

app.put('/api/admin/products/:id', authMiddleware, (req, res) => {
  const { nombre, categoria, precio, descripcion, kilos, cantidad_prendas, calidad, disponible } = req.body;
  const ok = db.updateProduct(Number(req.params.id), {
    nombre, categoria, precio: Number(precio),
    descripcion: descripcion || '',
    kilos: kilos ? Number(kilos) : null,
    cantidad_prendas: cantidad_prendas || null,
    calidad: calidad || null,
    disponible: !!disponible
  });
  if (!ok) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ message: 'Producto actualizado' });
});

app.patch('/api/admin/products/:id/disponible', authMiddleware, (req, res) => {
  const { disponible } = req.body;
  const product = db.getProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  db.updateProduct(Number(req.params.id), {
    nombre: product.nombre,
    categoria: product.categoria,
    precio: product.precio,
    descripcion: product.descripcion,
    kilos: product.kilos,
    cantidad_prendas: product.cantidad_prendas,
    calidad: product.calidad,
    disponible: !!disponible
  });
  res.json({ message: 'Estado actualizado' });
});

app.delete('/api/admin/products/:id', authMiddleware, (req, res) => {
  const images = db.deleteProduct(Number(req.params.id));
  images.forEach(img => {
    const filePath = path.join(uploadsDir, img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  res.json({ message: 'Producto eliminado' });
});

app.post('/api/admin/products/:id/images', authMiddleware, upload.array('images', 10), (req, res) => {
  const productId = Number(req.params.id);
  const product = db.getProduct(productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  req.files.forEach(file => db.addImage(productId, file.filename));
  res.json({ message: `${req.files.length} imagen(es) subida(s)` });
});

app.post('/api/admin/products/:id/thumbnail', authMiddleware, upload.single('thumbnail'), (req, res) => {
  const productId = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const oldFile = db.setThumbnailFile(productId, req.file.filename);
  if (oldFile === null) return res.status(404).json({ error: 'Producto no encontrado' });
  if (oldFile) {
    const oldPath = path.join(uploadsDir, oldFile);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  res.json({ filename: req.file.filename, message: 'Miniatura actualizada' });
});

app.delete('/api/admin/products/:id/thumbnail', authMiddleware, (req, res) => {
  const oldFile = db.removeThumbnail(Number(req.params.id));
  if (oldFile === null) return res.status(404).json({ error: 'Producto no encontrado' });
  if (oldFile) {
    const oldPath = path.join(uploadsDir, oldFile);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  res.json({ message: 'Miniatura eliminada' });
});

app.post('/api/admin/products/:id/videos', authMiddleware, uploadVideo.array('videos', 5), (req, res) => {
  const productId = Number(req.params.id);
  const product = db.getProduct(productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  req.files.forEach(file => db.addVideo(productId, file.filename));
  res.json({ message: `${req.files.length} video(s) subido(s)` });
});

app.delete('/api/admin/videos/:id', authMiddleware, (req, res) => {
  const vid = db.deleteVideo(Number(req.params.id));
  if (!vid) return res.status(404).json({ error: 'Video no encontrado' });
  const filePath = path.join(uploadsDir, vid.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: 'Video eliminado' });
});

app.delete('/api/admin/images/:id', authMiddleware, (req, res) => {
  const img = db.deleteImage(Number(req.params.id));
  if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });
  const filePath = path.join(uploadsDir, img.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: 'Imagen eliminada' });
});

app.listen(PORT, () => {
  console.log(`\n  Importadora Pembroke corriendo en http://localhost:${PORT}`);
  console.log(`  Panel admin: http://localhost:${PORT}/admin/`);
  console.log(`  Contraseña admin: ${ADMIN_PASSWORD}\n`);
});
