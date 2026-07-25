import ApiError from '../utils/ApiError.js';
import * as sessionRepo from '../repositories/session.repository.js';
import { verifyAccessToken, ACCESS_COOKIE } from '../utils/tokens.js';
import pool from '../config/database.js';

function extractToken(req) {
  // Preferir Bearer del SPA: en multiempresa evita mezclar sesiones
  // si la cookie httpOnly quedó de otro login en el mismo navegador.
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return { token, via: 'bearer' };

  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return { token: cookieToken, via: 'cookie' };

  return { token: null, via: null };
}

export async function authenticate(req, _res, next) {
  try {
    const { token, via } = extractToken(req);
    if (!token) {
      throw new ApiError(401, 'No autenticado', [], 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Token inválido o expirado', [], 'UNAUTHORIZED');
    }

    const idUsuario = payload.id_usuario || payload.sub;
    const sessionId = payload.sessionId;

    if (sessionId) {
      const session = await sessionRepo.findValidSession(sessionId);
      if (!session || Number(session.id_usuario) !== Number(idUsuario)) {
        throw new ApiError(401, 'Sesión revocada o expirada', [], 'UNAUTHORIZED');
      }
      req.sessionId = sessionId;
    }

    const [rows] = await pool.query(
      `
      SELECT u.id_usuario, u.nombre_completo, u.nombre_usuario, u.estado,
             u.id_empresa, r.nombre AS rol
      FROM usuarios u
      INNER JOIN roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ?
      LIMIT 1
    `,
      [idUsuario]
    );

    if (!rows.length || !rows[0].estado) {
      throw new ApiError(401, 'Usuario inactivo o no encontrado', [], 'UNAUTHORIZED');
    }

    req.user = {
      id_usuario: rows[0].id_usuario,
      nombre_completo: rows[0].nombre_completo,
      nombre_usuario: rows[0].nombre_usuario,
      rol: rows[0].rol,
      id_empresa: rows[0].id_empresa == null ? null : Number(rows[0].id_empresa)
    };
    req.authVia = via;

    next();
  } catch (error) {
    next(error);
  }
}

/** Alias Doc 8 / compat */
export const authMiddleware = authenticate;
export default authenticate;
