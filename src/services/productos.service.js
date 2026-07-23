import pool from '../config/database.js';
import { destroyCloudinaryAsset } from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';
import { uniqueSlug } from '../utils/slug.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { uploadFilesForNewProduct } from './imagenes.service.js';

async function slugExists(slug, excludeId = null) {
  const params = [slug];
  let sql = 'SELECT id_producto FROM productos WHERE slug = ?';
  if (excludeId) {
    sql += ' AND id_producto <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

async function assertCategoriaActiva(id_categoria, connection = pool) {
  const [rows] = await connection.query(
    `
    SELECT id_categoria, nombre
    FROM categorias
    WHERE id_categoria = ? AND activo = 1 AND estado = 1
    LIMIT 1
  `,
    [id_categoria]
  );
  if (!rows.length) {
    throw new ApiError(400, 'Categoría inactiva o no encontrada');
  }
  return rows[0];
}

function mapProductPayload(payload) {
  // Doc 2 columns: color_estilo, material.
  // Doc 3 example uses "color" (accepted as alias) and "talla" (NOT in schema — ignored).
  const color_estilo =
    payload.color_estilo !== undefined
      ? payload.color_estilo
      : payload.color !== undefined
        ? payload.color
        : undefined;

  return {
    codigo: payload.codigo,
    nombre: payload.nombre,
    id_categoria: payload.id_categoria,
    descripcion_corta: payload.descripcion_corta ?? null,
    descripcion_completa: payload.descripcion_completa ?? null,
    precio_venta: payload.precio_venta,
    precio_anterior: payload.precio_anterior ?? null,
    stock_minimo: payload.stock_minimo ?? 0,
    unidad_medida: payload.unidad_medida || 'Unidad',
    marca: payload.marca ?? null,
    color_estilo: color_estilo ?? null,
    material: payload.material !== undefined ? payload.material : null,
    personalizable: payload.personalizable ? 1 : 0,
    estado_publicacion: payload.estado_publicacion || 'Publicado',
    destacado: payload.destacado ? 1 : 0
  };
}

function orderClause(orden) {
  switch (orden) {
    case 'nombre_asc':
      return 'p.nombre ASC';
    case 'nombre_desc':
      return 'p.nombre DESC';
    case 'precio_asc':
      return 'p.precio_venta ASC';
    case 'precio_desc':
      return 'p.precio_venta DESC';
    case 'stock_asc':
      return 'p.stock_actual ASC';
    case 'stock_desc':
      return 'p.stock_actual DESC';
    case 'recientes':
    default:
      return 'p.fecha_creacion DESC';
  }
}

export async function getProductoAdminById(id) {
  const [rows] = await pool.query(
    `
    SELECT p.*, c.id_categoria AS cat_id, c.nombre AS categoria_nombre
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.id_producto = ?
    LIMIT 1
  `,
    [id]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Producto no encontrado');
  }

  const p = rows[0];
  const [imagenes] = await pool.query(
    `
    SELECT id_imagen, imagen_url, imagen_public_id, texto_alternativo,
           es_principal, orden_visual AS orden, activo
    FROM producto_imagenes
    WHERE id_producto = ? AND activo = 1
    ORDER BY es_principal DESC, orden_visual ASC, id_imagen ASC
  `,
    [id]
  );

  return {
    id_producto: p.id_producto,
    codigo: p.codigo,
    nombre: p.nombre,
    slug: p.slug,
    descripcion_corta: p.descripcion_corta,
    descripcion_completa: p.descripcion_completa,
    categoria: {
      id_categoria: p.cat_id,
      nombre: p.categoria_nombre
    },
    precio_venta: Number(p.precio_venta),
    precio_anterior: p.precio_anterior !== null ? Number(p.precio_anterior) : null,
    stock_actual: p.stock_actual,
    stock_minimo: p.stock_minimo,
    unidad_medida: p.unidad_medida,
    marca: p.marca,
    color_estilo: p.color_estilo,
    material: p.material,
    personalizable: !!p.personalizable,
    estado_disponibilidad: p.estado_disponibilidad,
    estado_publicacion: p.estado_publicacion,
    destacado: !!p.destacado,
    activo: !!p.activo,
    fecha_creacion: p.fecha_creacion,
    fecha_actualizacion: p.fecha_actualizacion,
    imagenes
  };
}

export async function listProductos(query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['p.activo = 1'];
  const params = [];

  if (query.busqueda) {
    where.push(
      '(p.nombre LIKE ? OR p.codigo LIKE ? OR p.marca LIKE ? OR p.descripcion_corta LIKE ?)'
    );
    const like = `%${query.busqueda}%`;
    params.push(like, like, like, like);
  }
  if (query.categoria) {
    where.push('p.id_categoria = ?');
    params.push(Number(query.categoria));
  }
  if (query.publicacion) {
    where.push('p.estado_publicacion = ?');
    params.push(query.publicacion);
  }
  if (query.disponibilidad) {
    where.push('p.estado_disponibilidad = ?');
    params.push(query.disponibilidad);
  }
  if (query.stock_bajo === 'true' || query.stock_bajo === true) {
    where.push('p.stock_actual <= p.stock_minimo');
  }
  if (query.destacado === 'true' || query.destacado === true) {
    where.push('p.destacado = 1');
  }
  if (query.precioMinimo !== undefined) {
    where.push('p.precio_venta >= ?');
    params.push(Number(query.precioMinimo));
  }
  if (query.precioMaximo !== undefined) {
    where.push('p.precio_venta <= ?');
    params.push(Number(query.precioMaximo));
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos p WHERE ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.slug, p.precio_venta, p.stock_actual,
           p.stock_minimo, p.estado_disponibilidad, p.estado_publicacion, p.destacado,
           p.fecha_creacion, c.nombre AS categoria,
           i.imagen_url AS imagen_principal
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN producto_imagenes i
      ON i.id_producto = p.id_producto AND i.es_principal = 1 AND i.activo = 1
    WHERE ${whereSql}
    ORDER BY ${orderClause(query.orden)}
    LIMIT ? OFFSET ?
  `,
    [...params, limite, offset]
  );

  return {
    data: rows.map((row) => ({
      ...row,
      precio_venta: Number(row.precio_venta),
      destacado: !!row.destacado
    })),
    meta: buildMeta(countRows[0].total, pagina, limite)
  };
}

export async function createProducto(payload, files = [], id_usuario) {
  const data = mapProductPayload(payload);
  const stock_inicial = Number(payload.stock_inicial || 0);

  if (files.length > 6) {
    throw new ApiError(400, 'Máximo 6 imágenes por producto');
  }

  await assertCategoriaActiva(data.id_categoria);

  const [dupCodigo] = await pool.query(
    'SELECT id_producto FROM productos WHERE codigo = ? LIMIT 1',
    [data.codigo]
  );
  if (dupCodigo.length) {
    throw new ApiError(409, 'El código de producto ya existe');
  }

  const slug = await uniqueSlug(data.nombre, slugExists);
  const estado_disponibilidad =
    stock_inicial === 0 ? 'Agotado' : 'Disponible';

  const connection = await pool.getConnection();
  let id_producto;

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      INSERT INTO productos (
        codigo, nombre, slug, id_categoria, descripcion_corta, descripcion_completa,
        precio_venta, precio_anterior, stock_actual, stock_minimo, unidad_medida,
        marca, color_estilo, material, personalizable, estado_disponibilidad,
        estado_publicacion, destacado, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
      [
        data.codigo,
        data.nombre,
        slug,
        data.id_categoria,
        data.descripcion_corta,
        data.descripcion_completa,
        data.precio_venta,
        data.precio_anterior,
        stock_inicial,
        data.stock_minimo,
        data.unidad_medida,
        data.marca,
        data.color_estilo,
        data.material,
        data.personalizable,
        estado_disponibilidad,
        data.estado_publicacion,
        data.destacado
      ]
    );

    id_producto = result.insertId;

    if (stock_inicial > 0) {
      await connection.query(
        `
        INSERT INTO movimientos_inventario
          (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, id_usuario)
        VALUES (?, 'Stock inicial', ?, 0, ?, 'Inventario inicial', NULL, ?)
      `,
        [id_producto, stock_inicial, stock_inicial, id_usuario]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const uploadedPublicIds = [];
  if (files.length) {
    try {
      const imagesMeta = await uploadFilesForNewProduct(id_producto, files);
      uploadedPublicIds.push(...imagesMeta.map((i) => i.imagen_public_id));

      const conn2 = await pool.getConnection();
      try {
        await conn2.beginTransaction();
        for (const img of imagesMeta) {
          await conn2.query(
            `
            INSERT INTO producto_imagenes
              (id_producto, imagen_url, imagen_public_id, texto_alternativo, es_principal, orden_visual, activo)
            VALUES (?, ?, ?, ?, ?, ?, 1)
          `,
            [
              id_producto,
              img.imagen_url,
              img.imagen_public_id,
              img.texto_alternativo,
              img.es_principal,
              img.orden_visual
            ]
          );
        }
        await conn2.commit();
      } catch (error) {
        await conn2.rollback();
        throw error;
      } finally {
        conn2.release();
      }
    } catch (error) {
      for (const publicId of uploadedPublicIds) {
        try {
          await destroyCloudinaryAsset(publicId);
        } catch {
          /* ignore */
        }
      }
      throw error;
    }
  }

  return getProductoAdminById(id_producto);
}

export async function updateProducto(id, payload) {
  const current = await getProductoAdminById(id);
  const data = mapProductPayload({ ...current, ...payload });

  if (payload.id_categoria !== undefined) {
    await assertCategoriaActiva(payload.id_categoria);
  }

  if (payload.codigo && payload.codigo !== current.codigo) {
    const [dup] = await pool.query(
      'SELECT id_producto FROM productos WHERE codigo = ? AND id_producto <> ? LIMIT 1',
      [payload.codigo, id]
    );
    if (dup.length) {
      throw new ApiError(409, 'El código de producto ya existe');
    }
  }

  let slug = current.slug;
  if (payload.nombre && payload.nombre !== current.nombre) {
    slug = await uniqueSlug(payload.nombre, (s) => slugExists(s, id));
  }

  await pool.query(
    `
    UPDATE productos SET
      codigo = ?, nombre = ?, slug = ?, id_categoria = ?,
      descripcion_corta = ?, descripcion_completa = ?,
      precio_venta = ?, precio_anterior = ?, stock_minimo = ?,
      unidad_medida = ?, marca = ?, color_estilo = ?, material = ?,
      personalizable = ?, estado_disponibilidad = ?, estado_publicacion = ?, destacado = ?
    WHERE id_producto = ?
  `,
    [
      payload.codigo ?? current.codigo,
      payload.nombre ?? current.nombre,
      slug,
      payload.id_categoria ?? current.categoria.id_categoria,
      payload.descripcion_corta !== undefined
        ? payload.descripcion_corta
        : current.descripcion_corta,
      payload.descripcion_completa !== undefined
        ? payload.descripcion_completa
        : current.descripcion_completa,
      payload.precio_venta !== undefined
        ? payload.precio_venta
        : current.precio_venta,
      payload.precio_anterior !== undefined
        ? payload.precio_anterior
        : current.precio_anterior,
      payload.stock_minimo !== undefined
        ? payload.stock_minimo
        : current.stock_minimo,
      payload.unidad_medida ?? current.unidad_medida,
      payload.marca !== undefined ? payload.marca : current.marca,
      data.color_estilo,
      data.material,
      payload.personalizable !== undefined
        ? payload.personalizable
          ? 1
          : 0
        : current.personalizable
          ? 1
          : 0,
      payload.estado_disponibilidad ?? current.estado_disponibilidad,
      payload.estado_publicacion ?? current.estado_publicacion,
      payload.destacado !== undefined
        ? payload.destacado
          ? 1
          : 0
        : current.destacado
          ? 1
          : 0,
      id
    ]
  );

  return getProductoAdminById(id);
}

export async function deleteProducto(id) {
  await getProductoAdminById(id);
  await pool.query(
    'UPDATE productos SET activo = 0, estado_publicacion = ? WHERE id_producto = ?',
    ['Oculto', id]
  );
  return true;
}

export async function patchPublicacion(id, estado_publicacion) {
  await getProductoAdminById(id);
  await pool.query(
    'UPDATE productos SET estado_publicacion = ? WHERE id_producto = ?',
    [estado_publicacion, id]
  );
  return getProductoAdminById(id);
}

export async function patchDestacado(id, destacado) {
  await getProductoAdminById(id);
  await pool.query('UPDATE productos SET destacado = ? WHERE id_producto = ?', [
    destacado ? 1 : 0,
    id
  ]);
  return getProductoAdminById(id);
}

export async function patchDisponibilidad(id, estado_disponibilidad) {
  await getProductoAdminById(id);
  await pool.query(
    'UPDATE productos SET estado_disponibilidad = ? WHERE id_producto = ?',
    [estado_disponibilidad, id]
  );
  return getProductoAdminById(id);
}

export default {
  listProductos,
  getProductoAdminById,
  createProducto,
  updateProducto,
  deleteProducto,
  patchPublicacion,
  patchDestacado,
  patchDisponibilidad
};
