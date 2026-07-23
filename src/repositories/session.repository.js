import pool from '../config/database.js';
import { hashToken } from '../utils/passwords.js';

export async function createSession({
  id_sesion,
  id_usuario,
  refreshToken,
  userAgent,
  ip,
  expiresAt
}) {
  await pool.query(
    `
    INSERT INTO sesiones
      (id_sesion, id_usuario, refresh_token_hash, user_agent, ip, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      id_sesion,
      id_usuario,
      hashToken(refreshToken),
      userAgent?.slice(0, 255) || null,
      ip?.slice(0, 64) || null,
      expiresAt
    ]
  );
}

export async function findValidSession(id_sesion) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM sesiones
    WHERE id_sesion = ?
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `,
    [id_sesion]
  );
  return rows[0] || null;
}

export async function rotateRefreshToken(id_sesion, newRefreshToken, expiresAt) {
  const [result] = await pool.query(
    `
    UPDATE sesiones
    SET refresh_token_hash = ?, expires_at = ?
    WHERE id_sesion = ? AND revoked_at IS NULL
  `,
    [hashToken(newRefreshToken), expiresAt, id_sesion]
  );
  return result.affectedRows > 0;
}

export async function revokeSession(id_sesion) {
  await pool.query(
    'UPDATE sesiones SET revoked_at = NOW() WHERE id_sesion = ? AND revoked_at IS NULL',
    [id_sesion]
  );
}

export async function revokeAllForUser(id_usuario, exceptSessionId = null) {
  if (exceptSessionId) {
    await pool.query(
      `
      UPDATE sesiones
      SET revoked_at = NOW()
      WHERE id_usuario = ? AND revoked_at IS NULL AND id_sesion <> ?
    `,
      [id_usuario, exceptSessionId]
    );
    return;
  }
  await pool.query(
    `
    UPDATE sesiones
    SET revoked_at = NOW()
    WHERE id_usuario = ? AND revoked_at IS NULL
  `,
    [id_usuario]
  );
}

export async function verifyRefresh(id_sesion, refreshToken) {
  const session = await findValidSession(id_sesion);
  if (!session) return null;
  if (session.refresh_token_hash !== hashToken(refreshToken)) return null;
  return session;
}
