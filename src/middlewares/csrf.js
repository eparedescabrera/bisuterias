/**
 * CSRF middleware (Documento 8).
 *
 * En este proyecto el panel está en Vercel y la API en Railway (orígenes distintos).
 * El patrón de doble cookie CSRF no aplica: JavaScript en Vercel no puede leer
 * la cookie csrf_token emitida por Railway.
 *
 * Protección real de escrituras:
 * - CORS restringido a CORS_ORIGINS
 * - JWT (cookie HttpOnly y/o Authorization Bearer)
 * - requireAdmin en /api/admin
 *
 * Se deja el middleware como no-op para no romper el orden de rutas.
 */
export function csrfProtection(_req, _res, next) {
  return next();
}

export default csrfProtection;
