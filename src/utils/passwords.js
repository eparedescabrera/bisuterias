import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ApiError from './ApiError.js';

const BCRYPT_COST = 12;

/**
 * Hash bcrypt válido generado al cargar el módulo.
 * Solo sirve para igualar tiempos cuando el usuario no existe.
 * No corresponde a ninguna contraseña de producción.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  Math.min(BCRYPT_COST, 10)
);

const COMMON = new Set([
  'password',
  'password123',
  '1234567890',
  'admin12345',
  'qwerty1234',
  'accesorio',
  'inventario',
  'gama1234'
]);

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash || DUMMY_PASSWORD_HASH);
}

/**
 * Siempre ejecuta bcrypt.compare para no filtrar si el usuario existe.
 */
export async function verifyPasswordOrDummy(password, hash) {
  const target =
    hash && String(hash).startsWith('$2') ? hash : DUMMY_PASSWORD_HASH;
  return bcrypt.compare(String(password || ''), target);
}

/** Huella del intento (no guarda usuario/contraseña en claro). */
export function fingerprintIdentifier(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || '').trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

/** Política Doc 8: mín. 10, letras, números y especial */
export function assertPasswordPolicy(password) {
  if (!password || password.length < 10) {
    throw new ApiError(
      400,
      'La contraseña debe tener al menos 10 caracteres'
    );
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ApiError(
      400,
      'La contraseña debe combinar letras y números'
    );
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new ApiError(
      400,
      'La contraseña debe incluir al menos un carácter especial'
    );
  }
  if (COMMON.has(String(password).toLowerCase())) {
    throw new ApiError(400, 'La contraseña es demasiado común');
  }
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export { BCRYPT_COST, DUMMY_PASSWORD_HASH };
