import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ApiError from './ApiError.js';

const BCRYPT_COST = 12;

const COMMON = new Set([
  'password',
  'password123',
  '1234567890',
  'admin12345',
  'qwerty1234',
  'accesorio',
  'inventario'
]);

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
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

export { BCRYPT_COST };
