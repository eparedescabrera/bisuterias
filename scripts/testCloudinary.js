import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const base = process.env.API_PUBLIC_URL || 'http://localhost:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(__dirname, '../uploads');
fs.mkdirSync(tmp, { recursive: true });

// 1x1 PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const pngPath = path.join(tmp, 'test.png');
const pdfPath = path.join(tmp, 'test.pdf');
fs.writeFileSync(pngPath, png);
fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4 fake'));

function mark(name, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function login() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre_usuario: 'admin',
      password: process.env.ADMIN_PASSWORD
    })
  });
  const json = await res.json();
  if (!process.env.ADMIN_PASSWORD || !json?.data?.token) {
    throw new Error('Login falló (defina ADMIN_PASSWORD en .env)');
  }
  return json.data.token;
}

async function createProduct(token) {
  const res = await fetch(`${base}/api/admin/productos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      codigo: `CLD-${Date.now().toString().slice(-6)}`,
      nombre: 'Producto Cloudinary',
      id_categoria: 1,
      precio_venta: 1000,
      stock_inicial: 1,
      estado_publicacion: 'Publicado'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'No se creó producto');
  return json.data.id_producto;
}

async function run() {
  let failed = 0;
  const token = await login();
  const id = await createProduct(token);

  // Upload 1 PNG
  {
    const form = new FormData();
    form.append('imagenes', new Blob([png], { type: 'image/png' }), 'test.png');
    const res = await fetch(`${base}/api/admin/productos/${id}/imagenes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const json = await res.json();
    const ok =
      res.ok &&
      Array.isArray(json.data) &&
      json.data.length >= 1 &&
      !!json.data[0].imagen_url;
    if (!mark('Subir imagen PNG a Cloudinary', ok, json.data?.[0]?.imagen_url || json.message)) {
      failed += 1;
    }
  }

  // Reject PDF
  {
    const form = new FormData();
    form.append(
      'imagenes',
      new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }),
      'test.pdf'
    );
    const res = await fetch(`${base}/api/admin/productos/${id}/imagenes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const ok = res.status === 400;
    if (!mark('Rechazar PDF como imagen', ok, `status=${res.status}`)) failed += 1;
  }

  // Reject >6 images (product already has 1; send 6 more => 7 total)
  {
    const form = new FormData();
    for (let i = 0; i < 6; i += 1) {
      form.append('imagenes', new Blob([png], { type: 'image/png' }), `extra-${i}.png`);
    }
    const res = await fetch(`${base}/api/admin/productos/${id}/imagenes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const json = await res.json();
    const ok = res.status === 400;
    if (
      !mark(
        'Rechazar más de 6 imágenes activas',
        ok,
        `status=${res.status} msg=${json.message || ''}`
      )
    ) {
      failed += 1;
    }
  }

  console.log(`\nCloudinary checklist: ${failed === 0 ? 'COMPLETO' : `${failed} fallos`}`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
