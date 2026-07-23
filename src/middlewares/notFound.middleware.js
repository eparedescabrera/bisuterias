import { fail } from '../utils/response.js';

export function notFoundMiddleware(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

export default notFoundMiddleware;
