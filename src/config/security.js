import env from './env.js';

export const ACCESS_TTL_MS = 30 * 60 * 1000;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CSRF_TTL_MS = REFRESH_TTL_MS;

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export function getUserAgent(req) {
  return req.get('user-agent') || null;
}

export const corsOrigins = env.corsOrigins;

export default {
  ACCESS_TTL_MS,
  REFRESH_TTL_MS,
  CSRF_TTL_MS,
  ALLOWED_IMAGE_MIME,
  ALLOWED_IMAGE_EXT,
  getClientIp,
  getUserAgent,
  corsOrigins
};
