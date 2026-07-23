import ApiError from '../utils/ApiError.js';
import { CSRF_COOKIE, ACCESS_COOKIE } from '../utils/tokens.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF doble envío cuando la autenticación usa cookies.
 * Clientes solo con Authorization Bearer (sin cookie access) se omiten (Doc 8).
 */
export function csrfProtection(req, _res, next) {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  const full = req.originalUrl || '';
  if (full.includes('/api/auth/login') || full.includes('/api/auth/refresh')) {
    return next();
  }

  const accessCookie = req.cookies?.[ACCESS_COOKIE];
  const hasBearer = Boolean(
    req.headers.authorization?.startsWith('Bearer ')
  );

  // Herramientas API / Thunder Client: Bearer sin cookie → sin CSRF
  if (!accessCookie && hasBearer) {
    return next();
  }

  // Sin cookie de sesión: authenticate responderá 401
  if (!accessCookie) {
    return next();
  }

  const header = req.get('X-CSRF-Token') || req.get('x-csrf-token');
  const cookie = req.cookies?.[CSRF_COOKIE];

  if (!header || !cookie || header !== cookie) {
    return next(
      new ApiError(403, 'Token CSRF inválido o ausente', [], 'FORBIDDEN')
    );
  }

  return next();
}

export default csrfProtection;
