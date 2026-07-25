import pool from '../config/database.js';
import {
  uploadBufferToCloudinary,
  destroyCloudinaryAsset
} from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import { normalizeMapaUrl, resolveMapsDisplay } from '../utils/mapsUrl.js';

function normalizeWhatsapp(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).replace(/\D/g, '');
}

/** Crea fila de configuración si la empresa aún no tiene (idempotente). */
export async function ensureConfiguracion(id_empresa) {
  const [existing] = await pool.query(
    `
    SELECT id_configuracion FROM configuracion_negocio
    WHERE id_empresa = ?
    LIMIT 1
  `,
    [id_empresa]
  );
  if (existing.length) return;

  const [emp] = await pool.query(
    `
    SELECT nombre_negocio, telefono, correo, direccion
    FROM empresas
    WHERE id_empresa = ? AND activo = 1
    LIMIT 1
  `,
    [id_empresa]
  );
  if (!emp.length) {
    throw new ApiError(404, 'Empresa no encontrada');
  }

  const e = emp[0];
  await pool.query(
    `
    INSERT INTO configuracion_negocio
      (id_empresa, nombre_negocio, telefono, whatsapp, correo, direccion,
       moneda, mostrar_stock_publico, mensaje_bienvenida)
    VALUES (?, ?, ?, ?, ?, ?, 'CRC', 0, ?)
  `,
    [
      id_empresa,
      e.nombre_negocio,
      e.telefono,
      e.telefono,
      e.correo,
      e.direccion,
      `Bienvenido a ${e.nombre_negocio}`
    ]
  );
}

export async function getConfiguracionAdmin(id_empresa) {
  await ensureConfiguracion(id_empresa);

  const [rows] = await pool.query(
    `
    SELECT c.*, e.slug AS tienda_slug, e.estado AS empresa_estado
    FROM configuracion_negocio c
    INNER JOIN empresas e ON e.id_empresa = c.id_empresa
    WHERE c.id_empresa = ?
    LIMIT 1
  `,
    [id_empresa]
  );
  if (!rows.length) {
    throw new ApiError(404, 'Configuración no encontrada');
  }
  const c = rows[0];
  return {
    ...c,
    mostrar_stock_publico: !!c.mostrar_stock_publico,
    tienda_slug: c.tienda_slug,
    tienda_url_path: c.tienda_slug ? `/t/${c.tienda_slug}` : null
  };
}

export async function getConfiguracionPublica(id_empresa) {
  const config = await getConfiguracionAdmin(id_empresa);
  const maps = resolveMapsDisplay({
    mapa_url: config.mapa_url,
    direccion: config.direccion
  });
  return {
    nombre_negocio: config.nombre_negocio,
    descripcion: config.descripcion,
    logo_url: config.logo_url,
    portada_url: config.portada_url,
    telefono: config.telefono,
    whatsapp: config.whatsapp,
    correo: config.correo,
    direccion: config.direccion,
    mapa_url: maps.link,
    mapa_embed_url: maps.embed,
    facebook: config.facebook,
    instagram: config.instagram,
    moneda: config.moneda,
    mostrar_stock_publico: config.mostrar_stock_publico,
    mensaje_bienvenida: config.mensaje_bienvenida,
    mensaje_inferior: config.mensaje_inferior
  };
}

export async function updateConfiguracion(id_empresa, payload) {
  await getConfiguracionAdmin(id_empresa);
  const mapa_url = normalizeMapaUrl(payload.mapa_url);

  await pool.query(
    `
    UPDATE configuracion_negocio SET
      nombre_negocio = ?,
      descripcion = ?,
      telefono = ?,
      whatsapp = ?,
      correo = ?,
      direccion = ?,
      mapa_url = ?,
      facebook = ?,
      instagram = ?,
      moneda = ?,
      mostrar_stock_publico = ?,
      mensaje_bienvenida = ?,
      mensaje_inferior = ?
    WHERE id_empresa = ?
  `,
    [
      payload.nombre_negocio,
      payload.descripcion ?? null,
      payload.telefono ?? null,
      normalizeWhatsapp(payload.whatsapp),
      payload.correo ?? null,
      payload.direccion ?? null,
      mapa_url,
      payload.facebook ?? null,
      payload.instagram ?? null,
      payload.moneda || 'CRC',
      payload.mostrar_stock_publico ? 1 : 0,
      payload.mensaje_bienvenida ?? null,
      payload.mensaje_inferior ?? null,
      id_empresa
    ]
  );

  // Mantener nombre visible también en empresas
  if (payload.nombre_negocio) {
    await pool.query(
      `UPDATE empresas SET nombre_negocio = ? WHERE id_empresa = ?`,
      [payload.nombre_negocio, id_empresa]
    );
  }

  return getConfiguracionAdmin(id_empresa);
}

async function replaceAsset(id_empresa, fieldUrl, fieldPublicId, file, folder) {
  const current = await getConfiguracionAdmin(id_empresa);
  const previousPublicId = current[fieldPublicId];

  const uploaded = await uploadBufferToCloudinary(file.buffer, folder);

  try {
    await pool.query(
      `
      UPDATE configuracion_negocio
      SET ${fieldUrl} = ?, ${fieldPublicId} = ?
      WHERE id_empresa = ?
    `,
      [uploaded.secure_url, uploaded.public_id, id_empresa]
    );

    if (fieldUrl === 'logo_url') {
      await pool.query(
        `
        UPDATE empresas
        SET logo_url = ?, logo_public_id = ?
        WHERE id_empresa = ?
      `,
        [uploaded.secure_url, uploaded.public_id, id_empresa]
      );
    }
  } catch (error) {
    try {
      await destroyCloudinaryAsset(uploaded.public_id);
    } catch {
      /* ignore */
    }
    throw error;
  }

  if (previousPublicId) {
    try {
      await destroyCloudinaryAsset(previousPublicId);
    } catch {
      /* ignore */
    }
  }

  return getConfiguracionAdmin(id_empresa);
}

export async function uploadLogo(id_empresa, file) {
  if (!file) throw new ApiError(400, 'Debe enviar un archivo logo');
  return replaceAsset(
    id_empresa,
    'logo_url',
    'logo_public_id',
    file,
    `inventory-pro/empresas/${id_empresa}/negocio`
  );
}

export async function uploadPortada(id_empresa, file) {
  if (!file) throw new ApiError(400, 'Debe enviar un archivo portada');
  return replaceAsset(
    id_empresa,
    'portada_url',
    'portada_public_id',
    file,
    `inventory-pro/empresas/${id_empresa}/negocio`
  );
}

export default {
  ensureConfiguracion,
  getConfiguracionAdmin,
  getConfiguracionPublica,
  updateConfiguracion,
  uploadLogo,
  uploadPortada
};
