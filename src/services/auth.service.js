import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import {
  comparePassword,
  hashPassword,
  assertPasswordPolicy,
  verifyPasswordOrDummy,
  fingerprintIdentifier
} from '../utils/passwords.js';
import {
  createSessionId,
  signAccessToken,
  createRefreshToken,
  cookieOptions,
  csrfCookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  SESSION_COOKIE
} from '../utils/tokens.js';
import { randomToken } from '../utils/passwords.js';
import * as sessionRepo from '../repositories/session.repository.js';
import * as auditoria from '../repositories/auditoria.repository.js';
import {
  ACCESS_TTL_MS,
  REFRESH_TTL_MS,
  CSRF_TTL_MS,
  getClientIp,
  getUserAgent
} from '../config/security.js';

function publicUser(usuario) {
  return {
    id_usuario: usuario.id_usuario,
    nombre_completo: usuario.nombre_completo,
    nombre_usuario: usuario.nombre_usuario,
    rol: usuario.rol,
    id_empresa: usuario.id_empresa == null ? null : Number(usuario.id_empresa)
  };
}

function setAuthCookies(res, { accessToken, refreshToken, sessionId, csrf }) {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_MS));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_MS));
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions(REFRESH_TTL_MS));
  res.cookie(CSRF_COOKIE, csrf, csrfCookieOptions(CSRF_TTL_MS));
}

function clearAuthCookies(res) {
  const base = cookieOptions(0);
  const csrfBase = csrfCookieOptions(0);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(SESSION_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, csrfBase);
}

async function issueSession(usuario, req, res) {
  const sessionId = createSessionId();
  const refreshToken = createRefreshToken();
  const csrf = randomToken(24);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await sessionRepo.createSession({
    id_sesion: sessionId,
    id_usuario: usuario.id_usuario,
    refreshToken,
    userAgent: getUserAgent(req),
    ip: getClientIp(req),
    expiresAt
  });

  const accessToken = signAccessToken({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    rol: usuario.rol,
    sessionId,
    id_empresa: usuario.id_empresa ?? null
  });

  setAuthCookies(res, { accessToken, refreshToken, sessionId, csrf });

  // accessToken en body: el SPA lo guarda en memoria (no localStorage).
  // Necesario con frontend y API en dominios distintos (Vercel / Railway).
  return {
    token: accessToken,
    accessToken,
    csrfToken: csrf,
    usuario: publicUser(usuario)
  };
}

export async function login(nombre_usuario, password, req, res) {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  // Nunca auditar ni devolver el usuario/contraseña en claro
  const intentoId = fingerprintIdentifier(nombre_usuario);

  const [rows] = await pool.query(
    `
    SELECT u.id_usuario, u.nombre_completo, u.nombre_usuario, u.password_hash,
           u.estado, u.id_empresa, r.nombre AS rol
    FROM usuarios u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.nombre_usuario = ?
    LIMIT 1
  `,
    [nombre_usuario]
  );

  const usuario = rows[0];
  const hash = usuario?.estado ? usuario.password_hash : null;
  const ok = await verifyPasswordOrDummy(password, hash);

  if (!usuario || !usuario.estado || !ok) {
    await auditoria.registrar({
      id_usuario: usuario?.estado ? usuario.id_usuario : null,
      accion: 'login_fallido',
      recurso: 'auth',
      resultado: 'fail',
      ip,
      user_agent: ua,
      metadata: { intento_id: intentoId }
    });
    throw new ApiError(401, 'Credenciales incorrectas', [], 'UNAUTHORIZED');
  }

  // Super Admin: entra sin empresa
  if (usuario.rol !== 'SuperAdministrador') {
    if (!usuario.id_empresa) {
      throw new ApiError(403, 'Usuario sin empresa asignada', [], 'FORBIDDEN');
    }

    const [empRows] = await pool.query(
      `
      SELECT id_empresa, estado, fecha_vencimiento
      FROM empresas
      WHERE id_empresa = ? AND activo = 1
      LIMIT 1
    `,
      [usuario.id_empresa]
    );

    if (!empRows.length) {
      throw new ApiError(403, 'Empresa no encontrada', [], 'FORBIDDEN');
    }

    let empresa = empRows[0];
    if (
      empresa.estado === 'Activa' &&
      empresa.fecha_vencimiento &&
      new Date(`${empresa.fecha_vencimiento}T23:59:59`) < new Date()
    ) {
      await pool.query(
        `UPDATE empresas SET estado = 'Vencida' WHERE id_empresa = ?`,
        [empresa.id_empresa]
      );
      empresa = { ...empresa, estado: 'Vencida' };
    }

    if (empresa.estado === 'Pendiente') {
      throw new ApiError(
        403,
        'Tu pago está siendo validado.',
        [],
        'EMPRESA_PENDIENTE'
      );
    }
    if (empresa.estado === 'Suspendida') {
      throw new ApiError(
        403,
        'Tu cuenta se encuentra suspendida.',
        [],
        'EMPRESA_SUSPENDIDA'
      );
    }
    if (empresa.estado === 'Vencida') {
      throw new ApiError(
        403,
        'Tu suscripción venció. Realiza nuevamente el pago por SINPE.',
        [],
        'EMPRESA_VENCIDA'
      );
    }
    if (empresa.estado !== 'Activa') {
      throw new ApiError(403, 'Empresa no autorizada', [], 'FORBIDDEN');
    }
  }

  await pool.query(
    'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
    [usuario.id_usuario]
  );

  const data = await issueSession(usuario, req, res);

  await auditoria.registrar({
    id_usuario: usuario.id_usuario,
    accion: 'login_exitoso',
    recurso: 'auth',
    resultado: 'ok',
    ip,
    user_agent: ua
  });

  return data;
}

export async function refresh(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!sessionId || !refreshToken) {
    throw new ApiError(401, 'Sesión no válida', [], 'UNAUTHORIZED');
  }

  const session = await sessionRepo.verifyRefresh(sessionId, refreshToken);
  if (!session) {
    clearAuthCookies(res);
    throw new ApiError(401, 'Sesión revocada o expirada', [], 'UNAUTHORIZED');
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
    [session.id_usuario]
  );

  if (!rows.length || !rows[0].estado) {
    await sessionRepo.revokeSession(sessionId);
    clearAuthCookies(res);
    throw new ApiError(401, 'Usuario inactivo', [], 'UNAUTHORIZED');
  }

  const usuario = rows[0];
  const newRefresh = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await sessionRepo.rotateRefreshToken(sessionId, newRefresh, expiresAt);

  const accessToken = signAccessToken({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    rol: usuario.rol,
    sessionId,
    id_empresa: usuario.id_empresa ?? null
  });
  const csrf = randomToken(24);
  setAuthCookies(res, {
    accessToken,
    refreshToken: newRefresh,
    sessionId,
    csrf
  });

  await auditoria.registrar({
    id_usuario: usuario.id_usuario,
    accion: 'refresh_token',
    recurso: 'auth',
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req)
  });

  return {
    token: accessToken,
    accessToken,
    csrfToken: csrf,
    usuario: publicUser(usuario)
  };
}

export async function logout(req, res) {
  const sessionId = req.sessionId || req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    await sessionRepo.revokeSession(sessionId);
  }
  clearAuthCookies(res);

  await auditoria.registrar({
    id_usuario: req.user?.id_usuario || null,
    accion: 'logout',
    recurso: 'auth',
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req)
  });

  return true;
}

export async function getPerfil(id_usuario) {
  const [rows] = await pool.query(
    `
    SELECT u.id_usuario, u.nombre_completo, u.nombre_usuario, u.correo,
           u.ultimo_acceso, u.id_empresa, r.nombre AS rol
    FROM usuarios u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = ? AND u.estado = 1
    LIMIT 1
  `,
    [id_usuario]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Usuario no encontrado', [], 'NOT_FOUND');
  }

  const row = rows[0];
  return {
    ...row,
    id_empresa: row.id_empresa == null ? null : Number(row.id_empresa)
  };
}

export async function cambiarPassword(
  id_usuario,
  password_actual,
  password_nueva,
  req,
  res
) {
  assertPasswordPolicy(password_nueva);

  const [rows] = await pool.query(
    'SELECT password_hash FROM usuarios WHERE id_usuario = ? AND estado = 1 LIMIT 1',
    [id_usuario]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Usuario no encontrado', [], 'NOT_FOUND');
  }

  const ok = await comparePassword(password_actual, rows[0].password_hash);
  if (!ok) {
    throw new ApiError(400, 'La contraseña actual es incorrecta', [], 'VALIDATION_ERROR');
  }

  if (await comparePassword(password_nueva, rows[0].password_hash)) {
    throw new ApiError(
      400,
      'La nueva contraseña no puede ser igual a la actual',
      [],
      'VALIDATION_ERROR'
    );
  }

  const hash = await hashPassword(password_nueva);
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [
    hash,
    id_usuario
  ]);

  // Revocar otras sesiones; mantener la actual con cookies renovadas
  const current = req.sessionId || req.cookies?.[SESSION_COOKIE];
  await sessionRepo.revokeAllForUser(id_usuario, current);

  const [userRows] = await pool.query(
    `
    SELECT u.id_usuario, u.nombre_completo, u.nombre_usuario, r.nombre AS rol,
           u.id_empresa
    FROM usuarios u
    INNER JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = ?
  `,
    [id_usuario]
  );

  if (current && userRows[0]) {
    // Rotar tokens de la sesión actual
    const newRefresh = createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await sessionRepo.rotateRefreshToken(current, newRefresh, expiresAt);
    const accessToken = signAccessToken({
      id_usuario: userRows[0].id_usuario,
      nombre_usuario: userRows[0].nombre_usuario,
      rol: userRows[0].rol,
      sessionId: current,
      id_empresa: userRows[0].id_empresa ?? null
    });
    setAuthCookies(res, {
      accessToken,
      refreshToken: newRefresh,
      sessionId: current,
      csrf: randomToken(24)
    });
  } else {
    clearAuthCookies(res);
  }

  await auditoria.registrar({
    id_usuario,
    accion: 'cambio_password',
    recurso: 'auth',
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req)
  });

  return true;
}

export async function revokeAllSessions(id_usuario, req, res) {
  await sessionRepo.revokeAllForUser(id_usuario);
  clearAuthCookies(res);
  await auditoria.registrar({
    id_usuario,
    accion: 'revoke_all_sessions',
    recurso: 'auth',
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req)
  });
  return true;
}

export { clearAuthCookies };

export default {
  login,
  refresh,
  logout,
  getPerfil,
  cambiarPassword,
  revokeAllSessions
};
