/**
 * Pruebas mínimas Documento 8 (capítulo 23).
 * Requiere backend en API_PUBLIC_URL (default http://localhost:3000).
 *
 * Uso: npm run test:security
 */
import 'dotenv/config';

const BASE = (process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const USER = process.env.ADMIN_USER || 'admin';
const PASS = process.env.ADMIN_PASSWORD;

if (!PASS) {
  console.error('Defina ADMIN_PASSWORD en .env para ejecutar las pruebas.');
  process.exit(1);
}

const results = [];

function jarFrom(res, jar = {}) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) {
      jar[pair.slice(0, idx)] = pair.slice(idx + 1);
    }
  }
  return jar;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function req(path, { method = 'GET', body, jar, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(jar ? { Cookie: cookieHeader(jar) } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (jar) jarFrom(res, jar);
  return { status: res.status, json, res, jar };
}

function assert(name, cond, detail = '') {
  results.push({ name, ok: Boolean(cond), detail });
  const mark = cond ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log(`Documento 8 — pruebas contra ${BASE}\n`);

  // 1. Login correcto + cookies
  const jar = {};
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { nombre_usuario: USER, password: PASS },
    jar
  });
  assert(
    'Login correcto (200)',
    login.status === 200 && login.json?.success === true
  );
  assert(
    'Cookies de sesión (access/refresh/csrf)',
    Boolean(jar.access_token && jar.refresh_token && jar.csrf_token && jar.session_id)
  );
  assert(
    'Login no expone token en body por defecto',
    !login.json?.data?.token && !login.json?.data?.accessToken
  );
  assert(
    'Login devuelve usuario mínimo',
    login.json?.data?.usuario?.nombre_usuario === USER &&
      login.json?.data?.usuario?.rol
  );

  // 2. Contraseña incorrecta
  const bad = await req('/api/auth/login', {
    method: 'POST',
    body: { nombre_usuario: USER, password: 'clave-incorrecta-xx' }
  });
  assert(
    'Contraseña incorrecta (401 genérico)',
    bad.status === 401 && bad.json?.message === 'Credenciales incorrectas'
  );

  // 3. Ruta admin sin sesión
  const noAuth = await req('/api/admin/dashboard/resumen');
  assert('Ruta admin sin sesión (401)', noAuth.status === 401);

  // 4. GET autenticado con cookie
  const me = await req('/api/auth/me', { jar });
  assert('GET /auth/me con cookie', me.status === 200 && me.json?.data?.nombre_usuario);

  // 5. CSRF ausente en escritura
  const csrfMiss = await req('/api/admin/sessions/revoke-all', {
    method: 'POST',
    jar: { ...jar }
  });
  assert(
    'CSRF ausente en escritura (403)',
    csrfMiss.status === 403
  );

  // 6. Escritura con CSRF
  const withCsrf = await req('/api/auth/logout', {
    method: 'POST',
    jar,
    headers: { 'X-CSRF-Token': jar.csrf_token }
  });
  assert('Logout con CSRF (200)', withCsrf.status === 200);

  // 7. Tras logout, me falla
  const meAfter = await req('/api/auth/me', { jar });
  assert('Sesión revocada tras logout (401)', meAfter.status === 401);

  // 8. Bearer opt-in + admin sin CSRF (herramienta API)
  const jar2 = {};
  const loginBearer = await req('/api/auth/login?include_token=1', {
    method: 'POST',
    body: { nombre_usuario: USER, password: PASS },
    jar: jar2
  });
  const token = loginBearer.json?.data?.token;
  assert('Token opt-in para API tools', Boolean(token));

  // Usar solo Bearer (sin cookie access) — simular limpiando cookies de auth
  const bearerOnly = await req('/api/admin/dashboard/resumen', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert('Bearer sin cookie accede a admin', bearerOnly.status === 200);

  // 9. SQL injection en búsqueda no tumba API (admin + público)
  const jar3 = {};
  const login3 = await req('/api/auth/login', {
    method: 'POST',
    body: { nombre_usuario: USER, password: PASS },
    jar: jar3
  });
  const bearer3 =
    login3.json?.data?.accessToken || login3.json?.data?.token || null;
  const sqliPayload = encodeURIComponent("'; DROP TABLE productos; --");
  const sqli = await req(`/api/admin/productos?busqueda=${sqliPayload}`, {
    jar: jar3,
    headers: bearer3 ? { Authorization: `Bearer ${bearer3}` } : {}
  });
  assert(
    'SQL injection en búsqueda admin no rompe API',
    sqli.status === 200 || sqli.status === 400 || sqli.status === 403
  );

  const sqliPublic = await req(
    `/api/public/productos?empresa=accesorios-anny&busqueda=${sqliPayload}&orden=${encodeURIComponent('precio_desc; DROP TABLE productos')}`
  );
  assert(
    'SQL injection en catálogo público no rompe API',
    sqliPublic.status === 200 || sqliPublic.status === 400
  );
  const healthAfter = await req('/api/health');
  assert(
    'API sigue operativa tras payloads SQLi',
    healthAfter.status === 200 || healthAfter.status === 503
  );

  // 10. Error genérico health
  const health = await req('/api/health');
  assert('Health responde', health.status === 200 || health.status === 503);

  // 11. Fuerza bruta / rate limit (best effort)
  let got429 = false;
  for (let i = 0; i < 8; i += 1) {
    const r = await req('/api/auth/login', {
      method: 'POST',
      body: { nombre_usuario: USER, password: `wrong-${i}` }
    });
    if (r.status === 429) {
      got429 = true;
      break;
    }
  }
  assert('Rate limit login (429 tras varios fallos)', got429);

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResultado: ${results.length - failed.length}/${results.length} OK`);
  if (failed.length) {
    console.error('Fallidas:', failed.map((f) => f.name).join(', '));
    process.exitCode = 1;
  } else {
    console.log('Pruebas Documento 8 (automatizables) aprobadas.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
