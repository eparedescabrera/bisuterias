/**
 * Checklist Documento 3 — pruebas mínimas de API
 * Ejecutar con: node scripts/checklistDoc3.js
 * Requiere servidor en API_PUBLIC_URL (default http://localhost:3000)
 */
import 'dotenv/config';

const base = process.env.API_PUBLIC_URL || 'http://localhost:3000';
const results = [];

async function req(method, path, { body, token, expectStatus } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const ok =
    expectStatus === undefined
      ? res.ok
      : res.status === expectStatus;

  return { ok, status: res.status, json };
}

function mark(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log(`Checklist Doc 3 contra ${base}\n`);

  const health = await req('GET', '/api/health');
  mark(
    'Health API + DB',
    health.ok &&
      health.json?.data?.api === 'ok' &&
      health.json?.data?.database === 'ok',
    `status=${health.status}`
  );

  const loginOk = await req('POST', '/api/auth/login', {
    body: {
      nombre_usuario: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASSWORD
    }
  });
  if (!process.env.ADMIN_PASSWORD) {
    mark('Login correcto devuelve token', false, 'Defina ADMIN_PASSWORD en .env');
    console.log('\nAbortado: falta ADMIN_PASSWORD');
    process.exit(1);
  }
  const token = loginOk.json?.data?.token;
  mark('Login correcto devuelve token', loginOk.ok && !!token);

  const loginFail = await req('POST', '/api/auth/login', {
    body: { nombre_usuario: 'admin', password: 'incorrecta' },
    expectStatus: 401
  });
  mark('Login incorrecto 401', loginFail.ok);

  const noToken = await req('GET', '/api/admin/categorias', { expectStatus: 401 });
  mark('Admin sin token 401', noToken.ok);

  const cat = await req('POST', '/api/admin/categorias', {
    token,
    body: {
      nombre: `Checklist ${Date.now()}`,
      descripcion: 'Temporal',
      estado: true
    }
  });
  mark('Crear categoría', cat.ok && cat.status === 201, `id=${cat.json?.data?.id_categoria}`);

  const dup = await req('POST', '/api/admin/categorias', {
    token,
    body: { nombre: cat.json?.data?.nombre, estado: true },
    expectStatus: 409
  });
  mark('Duplicado categoría 409', dup.ok);

  const codigo = `CHK-${Date.now().toString().slice(-6)}`;
  const prod = await req('POST', '/api/admin/productos', {
    token,
    body: {
      codigo,
      nombre: 'Producto checklist',
      id_categoria: 1,
      descripcion_corta: 'Prueba',
      precio_venta: 2500,
      stock_inicial: 4,
      stock_minimo: 1,
      estado_publicacion: 'Publicado',
      color_estilo: 'Dorado',
      material: 'Metal'
    }
  });
  const prodId = prod.json?.data?.id_producto;
  mark(
    'Crear producto sin imagen (permitido Doc 2)',
    prod.ok && prod.status === 201 && prod.json?.data?.stock_actual === 4,
    `id=${prodId}`
  );

  const salidaBad = await req('POST', '/api/admin/movimientos', {
    token,
    body: {
      id_producto: prodId,
      tipo_movimiento: 'Salida',
      cantidad: 999,
      motivo: 'Exceso checklist'
    },
    expectStatus: 409
  });
  mark('Salida mayor al stock 409', salidaBad.ok);

  const entrada = await req('POST', '/api/admin/movimientos', {
    token,
    body: {
      id_producto: prodId,
      tipo_movimiento: 'Entrada',
      cantidad: 2,
      motivo: 'Entrada checklist'
    }
  });
  mark(
    'Entrada inventario',
    entrada.ok && entrada.json?.data?.stock_nuevo === 6
  );

  const pubBefore = await req('GET', `/api/public/productos?busqueda=${encodeURIComponent(codigo)}`);
  mark(
    'Producto publicado en catálogo',
    pubBefore.ok && (pubBefore.json?.data?.length || 0) >= 1
  );

  await req('PATCH', `/api/admin/productos/${prodId}/publicacion`, {
    token,
    body: { estado_publicacion: 'Oculto' }
  });
  const pubAfter = await req('GET', `/api/public/productos?busqueda=${encodeURIComponent(codigo)}`);
  mark(
    'Ocultar producto lo saca del público',
    pubAfter.ok && (pubAfter.json?.data?.length || 0) === 0
  );

  await req('PATCH', `/api/admin/productos/${prodId}/publicacion`, {
    token,
    body: { estado_publicacion: 'Publicado' }
  });
  await req('POST', '/api/admin/movimientos', {
    token,
    body: {
      id_producto: prodId,
      tipo_movimiento: 'Salida',
      cantidad: 6,
      motivo: 'Agotar checklist'
    }
  });
  const detalle = await req('GET', '/api/public/productos/producto-checklist');
  // slug may be producto-checklist or producto-checklist-2 etc — get by admin then public slug
  const adminDet = await req('GET', `/api/admin/productos/${prodId}`, { token });
  const slug = adminDet.json?.data?.slug;
  const detPub = await req('GET', `/api/public/productos/${slug}`);
  mark(
    'Producto agotado visible con estado Agotado',
    detPub.ok && detPub.json?.data?.estado_disponibilidad === 'Agotado',
    `slug=${slug}`
  );

  await req('DELETE', `/api/admin/productos/${prodId}`, { token });
  const movs = await req('GET', `/api/admin/movimientos?id_producto=${prodId}`, { token });
  mark(
    'Borrado lógico conserva movimientos',
    movs.ok && (movs.json?.data?.length || 0) > 0
  );

  const catalogo = await req(
    'GET',
    '/api/public/productos?orden=precio_asc&pagina=1&limite=12'
  );
  mark(
    'Catálogo con orden y paginación',
    catalogo.ok && catalogo.json?.meta?.pagina === 1
  );

  const config = await req('GET', '/api/public/configuracion');
  mark(
    'Config pública con WhatsApp sin public_id',
    config.ok &&
      !!config.json?.data?.whatsapp &&
      config.json.data.logo_public_id === undefined &&
      config.json.data.portada_public_id === undefined
  );

  mark(
    'Cloudinary / subir imagen / PDF / >6 imágenes',
    false,
    'PENDIENTE: falta CLOUDINARY_* en .env'
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\nResultado: ${passed} OK, ${failed} pendientes/fallidos de ${results.length}`);
  process.exit(failed > 1 ? 1 : 0); // allow cloudinary pending
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
