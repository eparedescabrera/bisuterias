import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import env from '../config/env.js';
import { randomToken } from './passwords.js';

export function createSessionId() {
  return randomUUID();
}

export function signAccessToken({
  id_usuario,
  nombre_usuario,
  rol,
  sessionId,
  id_empresa = null
}) {
  return jwt.sign(
    {
      sub: id_usuario,
      id_usuario,
      nombre_usuario,
      rol,
      sessionId,
      id_empresa: id_empresa == null ? null : Number(id_empresa)
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
      algorithm: 'HS256'
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
}

export function createRefreshToken() {
  return randomToken(48);
}

export function cookieOptions(maxAgeMs) {
  const crossSite = env.cookieSameSite === 'none';
  return {
    httpOnly: true,
    secure: env.isProduction || crossSite,
    sameSite: env.cookieSameSite,
    maxAge: maxAgeMs,
    path: '/'
  };
}

export function csrfCookieOptions(maxAgeMs) {
  return {
    ...cookieOptions(maxAgeMs),
    httpOnly: false
  };
}

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const CSRF_COOKIE = 'csrf_token';
export const SESSION_COOKIE = 'session_id';
