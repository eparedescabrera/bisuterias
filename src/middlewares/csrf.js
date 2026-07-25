/**
 * Mitigación CSRF para API cross-origin (Vercel → Railway).
 *
 * Con COOKIE_SAME_SITE=none las cookies viajan en requests cross-site.
 * Un formulario malicioso podría autenticarse solo con cookie.
 * El SPA siempre envía Authorization Bearer (sessionStorage); un CSRF
 * clásico no puede forjar ese header → exigirlo en escrituras.
 *
 * GET/HEAD/OPTIONS no mutan estado y pasan.
 */
import ApiError from '../utils/ApiError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfProtection(req, _res, next) {
  if (SAFE.has(String(req.method || '').toUpperCase())) {
    return next();
  }

  if (req.authVia === 'bearer') {
    return next();
  }

  return next(
    new ApiError(
      403,
      'Solicitud rechazada por seguridad. Use el panel con sesión válida.',
      [],
      'CSRF_REJECTED'
    )
  );
}

export default csrfProtection;
