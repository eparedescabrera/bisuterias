import pool from '../config/database.js';
import env from '../config/env.js';
import {
  uploadBufferToCloudinary,
  destroyCloudinaryAsset
} from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

async function countActiveImages(id_producto, connection = pool) {
  const [rows] = await connection.query(
    `
    SELECT COUNT(*) AS total
    FROM producto_imagenes
    WHERE id_producto = ? AND activo = 1
  `,
    [id_producto]
  );
  return rows[0].total;
}

export async function listImagenes(id_producto) {
  const [rows] = await pool.query(
    `
    SELECT id_imagen, id_producto, imagen_url, imagen_public_id, texto_alternativo,
           es_principal, orden_visual, activo, fecha_creacion
    FROM producto_imagenes
    WHERE id_producto = ? AND activo = 1
    ORDER BY es_principal DESC, orden_visual ASC, id_imagen ASC
  `,
    [id_producto]
  );
  return rows;
}

export async function assertProductoDeEmpresa(id_empresa, id_producto) {
  const [producto] = await pool.query(
    `
    SELECT id_producto FROM productos
    WHERE id_producto = ? AND id_empresa = ? AND activo = 1
    LIMIT 1
  `,
    [id_producto, id_empresa]
  );
  if (!producto.length) {
    throw new ApiError(404, 'Producto no encontrado');
  }
}

export async function addImagenes(id_producto, files = [], id_empresa = null) {
  if (!files.length) {
    throw new ApiError(400, 'Debe enviar al menos una imagen');
  }

  if (id_empresa != null) {
    await assertProductoDeEmpresa(id_empresa, id_producto);
  } else {
    const [producto] = await pool.query(
      'SELECT id_producto FROM productos WHERE id_producto = ? AND activo = 1 LIMIT 1',
      [id_producto]
    );
    if (!producto.length) {
      throw new ApiError(404, 'Producto no encontrado');
    }
  }

  const actuales = await countActiveImages(id_producto);
  if (actuales + files.length > env.maxProductImages) {
    throw new ApiError(
      400,
      `Máximo ${env.maxProductImages} imágenes por producto`
    );
  }

  const uploaded = [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [principales] = await connection.query(
      `
      SELECT id_imagen FROM producto_imagenes
      WHERE id_producto = ? AND activo = 1 AND es_principal = 1
      LIMIT 1
    `,
      [id_producto]
    );
    let needsPrincipal = principales.length === 0;

    let orden = actuales;
    for (const file of files) {
      const result = await uploadBufferToCloudinary(
        file.buffer,
        `inventory-pro/productos/${id_producto}`
      );
      uploaded.push(result.public_id);

      const esPrincipal = needsPrincipal ? 1 : 0;
      if (needsPrincipal) needsPrincipal = false;

      await connection.query(
        `
        INSERT INTO producto_imagenes
          (id_producto, imagen_url, imagen_public_id, texto_alternativo, es_principal, orden_visual, activo)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
        [
          id_producto,
          result.secure_url,
          result.public_id,
          file.originalname || null,
          esPrincipal,
          orden
        ]
      );
      orden += 1;
    }

    await connection.commit();
    return listImagenes(id_producto);
  } catch (error) {
    await connection.rollback();
    for (const publicId of uploaded) {
      try {
        await destroyCloudinaryAsset(publicId);
      } catch {
        /* ignore cleanup errors */
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

/** Imágenes enviadas como JSON base64 (evita multipart / HTTP2 en Railway). */
export async function addImagenesBase64(id_producto, images = []) {
  if (!Array.isArray(images) || !images.length) {
    throw new ApiError(400, 'Debe enviar al menos una imagen');
  }

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const files = images.map((img, index) => {
    const mime = String(img.mime || img.contentType || '').toLowerCase();
    if (!allowed.has(mime)) {
      throw new ApiError(400, 'Formato de imagen no permitido. Use JPEG, PNG o WEBP');
    }
    const raw = String(img.data || '').replace(/^data:[^;]+;base64,/, '');
    let buffer;
    try {
      buffer = Buffer.from(raw, 'base64');
    } catch {
      throw new ApiError(400, 'Imagen base64 inválida');
    }
    if (!buffer.length) {
      throw new ApiError(400, 'Imagen vacía');
    }
    const max = env.maxFileSizeMb * 1024 * 1024;
    if (buffer.length > max) {
      throw new ApiError(413, `El archivo supera el máximo de ${env.maxFileSizeMb} MB`);
    }
    return {
      buffer,
      mimetype: mime,
      originalname: img.nombre || `imagen-${index + 1}.jpg`
    };
  });

  return addImagenes(id_producto, files);
}

export async function deleteImagen(id_producto, id_imagen) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id_imagen, imagen_public_id, es_principal
      FROM producto_imagenes
      WHERE id_imagen = ? AND id_producto = ? AND activo = 1
      FOR UPDATE
    `,
      [id_imagen, id_producto]
    );

    if (!rows.length) {
      throw new ApiError(404, 'Imagen no encontrada');
    }

    const imagen = rows[0];
    const restantes = await countActiveImages(id_producto, connection);

    if (imagen.es_principal && restantes > 1) {
      throw new ApiError(
        400,
        'Asigne otra imagen principal antes de eliminar la principal'
      );
    }

    await connection.query(
      'UPDATE producto_imagenes SET activo = 0, es_principal = 0 WHERE id_imagen = ?',
      [id_imagen]
    );

    await connection.commit();

    try {
      await destroyCloudinaryAsset(imagen.imagen_public_id);
    } catch {
      /* keep soft-deleted row even if cloud cleanup fails */
    }

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setImagenPrincipal(id_producto, id_imagen) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id_imagen FROM producto_imagenes
      WHERE id_imagen = ? AND id_producto = ? AND activo = 1
      FOR UPDATE
    `,
      [id_imagen, id_producto]
    );

    if (!rows.length) {
      throw new ApiError(404, 'Imagen no encontrada');
    }

    await connection.query(
      'UPDATE producto_imagenes SET es_principal = 0 WHERE id_producto = ? AND activo = 1',
      [id_producto]
    );
    await connection.query(
      'UPDATE producto_imagenes SET es_principal = 1 WHERE id_imagen = ?',
      [id_imagen]
    );

    await connection.commit();
    return listImagenes(id_producto);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function uploadFilesForNewProduct(id_producto, files = []) {
  const uploaded = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const result = await uploadBufferToCloudinary(
      file.buffer,
      `inventory-pro/productos/${id_producto}`
    );
    uploaded.push({
      imagen_url: result.secure_url,
      imagen_public_id: result.public_id,
      texto_alternativo: file.originalname || null,
      es_principal: i === 0 ? 1 : 0,
      orden_visual: i
    });
  }
  return uploaded;
}

export default {
  listImagenes,
  addImagenes,
  addImagenesBase64,
  deleteImagen,
  setImagenPrincipal,
  uploadFilesForNewProduct,
  assertProductoDeEmpresa
};
