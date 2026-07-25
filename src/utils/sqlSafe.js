/**
 * Utilidades anti SQL injection.
 * Regla: valores de usuario SIEMPRE con placeholders (?).
 * Identificadores (ORDER BY, columnas) solo desde whitelist fija.
 */
import ApiError from './ApiError.js';

/** Normaliza enteros seguros para LIMIT/OFFSET (nunca concatenar strings crudos). */
export function safeLimit(value, { min = 1, max = 100, fallback = 12 } = {}) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function safeOffset(pagina, limite) {
  const p = safeLimit(pagina, { min: 1, max: 1_000_000, fallback: 1 });
  return (p - 1) * limite;
}

/**
 * Resuelve ORDER BY desde un mapa fijo. Nunca interpolar input del cliente.
 */
export function resolveOrderBy(orden, allowedMap, defaultKey) {
  const key = String(orden || defaultKey || '');
  if (Object.prototype.hasOwnProperty.call(allowedMap, key)) {
    return allowedMap[key];
  }
  if (defaultKey && Object.prototype.hasOwnProperty.call(allowedMap, defaultKey)) {
    return allowedMap[defaultKey];
  }
  const first = Object.values(allowedMap)[0];
  if (!first) {
    throw new ApiError(500, 'ORDER BY no configurado');
  }
  return first;
}

/** Solo permite nombres de columna/tabla del conjunto dado. */
export function assertSqlIdentifier(name, allowedSet, label = 'identificador') {
  if (!allowedSet.has(name)) {
    throw new ApiError(400, `${label} no permitido`, [], 'VALIDATION_ERROR');
  }
  return name;
}

export const PRODUCTO_ORDER_ADMIN = {
  nombre_asc: 'p.nombre ASC',
  nombre_desc: 'p.nombre DESC',
  precio_asc: 'p.precio_venta ASC',
  precio_desc: 'p.precio_venta DESC',
  stock_asc: 'p.stock_actual ASC',
  stock_desc: 'p.stock_actual DESC',
  recientes: 'p.fecha_creacion DESC'
};

export const PRODUCTO_ORDER_PUBLIC = {
  nombre_asc: 'p.nombre ASC',
  nombre_desc: 'p.nombre DESC',
  precio_asc: 'p.precio_venta ASC',
  precio_desc: 'p.precio_venta DESC',
  recientes: 'p.destacado DESC, p.fecha_creacion DESC'
};

export default {
  safeLimit,
  safeOffset,
  resolveOrderBy,
  assertSqlIdentifier,
  PRODUCTO_ORDER_ADMIN,
  PRODUCTO_ORDER_PUBLIC
};
