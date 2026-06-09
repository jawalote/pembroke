# Importadora Pembroke - Instrucciones de instalación

## 1. Instalar Node.js

Ve a https://nodejs.org y descarga la versión LTS (recomendada).
Instálala con las opciones por defecto.

## 2. Abrir terminal en la carpeta del proyecto

Abre PowerShell o CMD y ejecuta:

    cd d:\pembroke
    npm install

## 3. Iniciar el servidor

    node server.js

## 4. Abrir el sitio

- Sitio web público: http://localhost:3000
- Panel admin:       http://localhost:3000/admin/

## 5. Contraseña del panel admin

La contraseña está en el archivo `.env`:

    ADMIN_PASSWORD=pembroke2024

Puedes cambiarla editando ese archivo y reiniciando el servidor.

---

## Para que el sitio esté disponible en internet

Opciones económicas:
- **Railway** (railway.app) — hosting Node.js gratis/barato
- **Render** (render.com) — gratis con limitaciones
- **VPS** — cualquier servidor con Node.js instalado
