import pool from '../config/database.js';
import {
  uploadBufferToCloudinary,
  destroyCloudinaryAsset
} from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

function normalizeWhatsapp(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).replace(/\D/g, '');
}

export async function getConfiguracionAdmin() {
  const [rows] = await pool.query(
    'SELECT * FROM configuracion_negocio WHERE id_configuracion = 1 LIMIT 1'
  );
  if (!rows.length) {
    throw new ApiError(404, 'Configuración no encontrada');
  }
  const c = rows[0];
  return {
    ...c,
    mostrar_stock_publico: !!c.mostrar_stock_publico
  };
}

export async function getConfiguracionPublica() {
  const config = await getConfiguracionAdmin();
  return {
    nombre_negocio: config.nombre_negocio,
    descripcion: config.descripcion,
    logo_url: config.logo_url,
    portada_url: config.portada_url,
    telefono: config.telefono,
    whatsapp: config.whatsapp,
    correo: config.correo,
    direccion: config.direccion,
    facebook: config.facebook,
    instagram: config.instagram,
    moneda: config.moneda,
    mostrar_stock_publico: config.mostrar_stock_publico,
    mensaje_bienvenida: config.mensaje_bienvenida,
    mensaje_inferior: config.mensaje_inferior
  };
}

export async function updateConfiguracion(payload) {
  await getConfiguracionAdmin();

  await pool.query(
    `
    UPDATE configuracion_negocio SET
      nombre_negocio = ?,
      descripcion = ?,
      telefono = ?,
      whatsapp = ?,
      correo = ?,
      direccion = ?,
      facebook = ?,
      instagram = ?,
      moneda = ?,
      mostrar_stock_publico = ?,
      mensaje_bienvenida = ?,
      mensaje_inferior = ?
    WHERE id_configuracion = 1
  `,
    [
      payload.nombre_negocio,
      payload.descripcion ?? null,
      payload.telefono ?? null,
      normalizeWhatsapp(payload.whatsapp),
      payload.correo ?? null,
      payload.direccion ?? null,
      payload.facebook ?? null,
      payload.instagram ?? null,
      payload.moneda || 'CRC',
      payload.mostrar_stock_publico ? 1 : 0,
      payload.mensaje_bienvenida ?? null,
      payload.mensaje_inferior ?? null
    ]
  );

  return getConfiguracionAdmin();
}

async function replaceAsset(fieldUrl, fieldPublicId, file, folder) {
  const current = await getConfiguracionAdmin();
  const previousPublicId = current[fieldPublicId];

  const uploaded = await uploadBufferToCloudinary(file.buffer, folder);

  try {
    await pool.query(
      `UPDATE configuracion_negocio SET ${fieldUrl} = ?, ${fieldPublicId} = ? WHERE id_configuracion = 1`,
      [uploaded.secure_url, uploaded.public_id]
    );
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

  return getConfiguracionAdmin();
}

export async function uploadLogo(file) {
  if (!file) throw new ApiError(400, 'Debe enviar un archivo logo');
  return replaceAsset(
    'logo_url',
    'logo_public_id',
    file,
    'inventory-pro/negocio'
  );
}

export async function uploadPortada(file) {
  if (!file) throw new ApiError(400, 'Debe enviar un archivo portada');
  return replaceAsset(
    'portada_url',
    'portada_public_id',
    file,
    'inventory-pro/negocio'
  );
}

export default {
  getConfiguracionAdmin,
  getConfiguracionPublica,
  updateConfiguracion,
  uploadLogo,
  uploadPortada
};
