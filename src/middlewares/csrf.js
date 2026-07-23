import ApiError from '../utils/ApiError.js';
import { CSRF_COOKIE, ACCESS_COOKIE } from '../utils/tokens.js';
import env from '../config/env.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF:
 * - Bearer → omitir (SPA cross-origin / herramientas API)
 * - Origin en CORS_ORIGINS → omitir (el navegador envía Origin real; no es falsificable en XHR)
 * - Cookie same-site sin Origin confiable → doble envío clásico
 */
export function csrfProtection(req, _res, next) {
  if (!WRITE_METHODS.has(req.method)) {
    return next();
  }

  const full = req.originalUrl || '';
  if (full.includes('/api/auth/login') || full.includes('/api/auth/refresh')) {
    return next();
  }

  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const origin = req.get('Origin');
  if (origin && env.corsOrigins.includes(origin)) {
    return next();
  }

  const accessCookie = req.cookies?.[ACCESS_COOKIE];
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
