import pool from '../config/database.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_actual',
  'password_nueva',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'nombre_usuario',
  'usuario',
  'user',
  'username',
  'correo',
  'email'
]);

function scrub(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(k)) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export async function registrar({
  id_usuario = null,
  accion,
  recurso = null,
  recurso_id = null,
  resultado = 'ok',
  ip = null,
  user_agent = null,
  metadata = null
}) {
  try {
    await pool.query(
      `
      INSERT INTO auditoria_sistema
        (id_usuario, accion, recurso, recurso_id, resultado, ip, user_agent, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id_usuario,
        accion,
        recurso,
        recurso_id != null ? String(recurso_id) : null,
        resultado,
        ip?.slice(0, 64) || null,
        user_agent?.slice(0, 255) || null,
        scrub(metadata) ? JSON.stringify(scrub(metadata)) : null
      ]
    );
  } catch (err) {
    // No romper la operación principal si falla la auditoría
    console.error('[auditoria]', err.message);
  }
}

export async function listar(query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['1=1'];
  const params = [];

  if (query.accion) {
    where.push('a.accion = ?');
    params.push(query.accion);
  }
  if (query.id_usuario) {
    where.push('a.id_usuario = ?');
    params.push(Number(query.id_usuario));
  }
  if (query.desde) {
    where.push('a.fecha_creacion >= ?');
    params.push(`${query.desde} 00:00:00`);
  }
  if (query.hasta) {
    where.push('a.fecha_creacion <= ?');
    params.push(`${query.hasta} 23:59:59`);
  }

  const whereSql = where.join(' AND ');
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM auditoria_sistema a WHERE ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT a.id_auditoria, a.id_usuario, a.accion, a.recurso, a.recurso_id,
           a.resultado, a.ip, a.user_agent, a.metadata_json, a.fecha_creacion,
           u.nombre_usuario
    FROM auditoria_sistema a
    LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
    WHERE ${whereSql}
    ORDER BY a.fecha_creacion DESC, a.id_auditoria DESC
    LIMIT ? OFFSET ?
  `,
    [...params, Number(limite), Number(offset)]
  );

  return { data: rows, meta: buildMeta(count.total, pagina, limite) };
}
