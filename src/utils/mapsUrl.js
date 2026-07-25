import ApiError from './ApiError.js';

const ALLOWED_HOST_RE =
  /^(?:[\w-]+\.)*(?:google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl)$/i;

/**
 * Valida y normaliza un enlace de Google Maps (o vacío).
 */
export function normalizeMapaUrl(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return null;
  }
  const value = String(raw).trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, 'El enlace del mapa no es una URL válida');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ApiError(400, 'El enlace del mapa debe ser http(s)');
  }
  if (!ALLOWED_HOST_RE.test(url.hostname)) {
    throw new ApiError(
      400,
      'Solo se permiten enlaces de Google Maps (maps.google.com, maps.app.goo.gl, etc.)'
    );
  }
  if (value.length > 600) {
    throw new ApiError(400, 'El enlace del mapa es demasiado largo');
  }
  return value;
}

/**
 * Devuelve URL de enlace + embed seguro a partir de mapa_url / dirección.
 */
export function resolveMapsDisplay({ mapa_url, direccion } = {}) {
  const link =
    (mapa_url && String(mapa_url).trim()) ||
    (direccion
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
      : null);

  let embed = null;
  const source = mapa_url && String(mapa_url).trim();
  if (source) {
    if (/\/maps\/embed/i.test(source) || /[?&]output=embed\b/i.test(source)) {
      embed = source;
    } else if (
      /google\./i.test(source) ||
      /maps\.app\.goo\.gl/i.test(source) ||
      /goo\.gl\//i.test(source)
    ) {
      embed = `https://www.google.com/maps?q=${encodeURIComponent(source)}&z=15&hl=es&output=embed`;
    }
  }
  if (!embed && direccion) {
    embed = `https://www.google.com/maps?q=${encodeURIComponent(direccion)}&z=15&hl=es&output=embed`;
  }

  return { link, embed };
}

export default { normalizeMapaUrl, resolveMapsDisplay };
