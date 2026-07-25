import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';

const DEFAULT_SLUG = process.env.PUBLIC_EMPRESA_SLUG || 'accesorios-anny';

const RESERVED = new Set([
  'admin',
  'login',
  'super-admin',
  'superadmin',
  'api',
  'suscribirse',
  't',
  'www',
  'static',
  'assets',
  'public'
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicSlug(raw) {
  if (raw == null) return null;
  const slug = String(raw).trim().toLowerCase();
  if (!slug || slug.length < 2 || slug.length > 80) return null;
  if (RESERVED.has(slug)) return null;
  if (!SLUG_RE.test(slug)) return null;
  return slug;
}

/**
 * Resuelve la empresa del catálogo público.
 * Prioridad: ?empresa=slug | header x-empresa-slug | default.
 * Solo empresas Activas. Nunca confiar en id_empresa del cliente.
 */
export async function resolveEmpresaPublica(req) {
  const raw =
    req.query?.empresa ||
    req.headers['x-empresa-slug'] ||
    DEFAULT_SLUG;

  const slug = normalizePublicSlug(raw) || normalizePublicSlug(DEFAULT_SLUG);
  if (!slug) {
    throw new ApiError(400, 'Identificador de tienda inválido', [], 'VALIDATION_ERROR');
  }

  const [rows] = await pool.query(
    `
    SELECT id_empresa, nombre_negocio, slug, estado
    FROM empresas
    WHERE slug = ? AND activo = 1
    LIMIT 1
  `,
    [slug]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Tienda no encontrada', [], 'NOT_FOUND');
  }

  if (rows[0].estado !== 'Activa') {
    throw new ApiError(403, 'Esta tienda no está disponible', [], 'FORBIDDEN');
  }

  return rows[0];
}

export default resolveEmpresaPublica;
