import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { getConfiguracionPublica } from './configuracion.service.js';

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
    case 'recientes':
    default:
      return 'p.destacado DESC, p.fecha_creacion DESC';
  }
}

export async function listCategoriasPublicas(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT id_categoria, nombre, slug, descripcion, imagen_url, orden_visual
    FROM categorias
    WHERE id_empresa = ? AND activo = 1 AND estado = 1
    ORDER BY orden_visual ASC, nombre ASC
  `,
    [id_empresa]
  );
  return rows;
}

export async function listProductosPublicos(id_empresa, query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = [
    'p.id_empresa = ?',
    'p.activo = 1',
    "p.estado_publicacion = 'Publicado'",
    'c.activo = 1',
    'c.estado = 1'
  ];
  const params = [id_empresa];

  if (query.busqueda) {
    where.push('(p.nombre LIKE ? OR p.descripcion_corta LIKE ? OR p.codigo LIKE ?)');
    const like = `%${query.busqueda}%`;
    params.push(like, like, like);
  }

  if (query.categoria) {
    if (/^\d+$/.test(String(query.categoria))) {
      where.push('p.id_categoria = ?');
      params.push(Number(query.categoria));
    } else {
      where.push('c.slug = ?');
      params.push(query.categoria);
    }
  }

  if (query.disponible === 'true' || query.disponible === true) {
    where.push("p.estado_disponibilidad = 'Disponible'");
    where.push('p.stock_actual > 0');
  }

  if (query.destacado === 'true' || query.destacado === true) {
    where.push('p.destacado = 1');
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE ${whereSql}
  `,
    params
  );

  const config = await getConfiguracionPublica(id_empresa);

  const [rows] = await pool.query(
    `
    SELECT
      p.id_producto, p.codigo, p.nombre, p.slug, p.descripcion_corta,
      p.precio_venta, p.precio_anterior, p.estado_disponibilidad, p.destacado,
      p.stock_actual, c.nombre AS categoria, c.slug AS categoria_slug,
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
      id_producto: row.id_producto,
      codigo: row.codigo,
      nombre: row.nombre,
      slug: row.slug,
      descripcion_corta: row.descripcion_corta,
      precio_venta: Number(row.precio_venta),
      precio_anterior:
        row.precio_anterior !== null ? Number(row.precio_anterior) : null,
      estado_disponibilidad: row.estado_disponibilidad,
      destacado: !!row.destacado,
      stock_visible: config.mostrar_stock_publico ? row.stock_actual : null,
      categoria: row.categoria,
      categoria_slug: row.categoria_slug,
      imagen_principal: row.imagen_principal
    })),
    meta: buildMeta(countRows[0].total, pagina, limite)
  };
}

export async function listDestacados(id_empresa, limite = 8) {
  const result = await listProductosPublicos(id_empresa, {
    destacado: true,
    limite,
    pagina: 1,
    orden: 'recientes'
  });
  return result.data;
}

export async function listRecientes(id_empresa, limite = 8) {
  const result = await listProductosPublicos(id_empresa, {
    limite,
    pagina: 1,
    orden: 'recientes'
  });
  return result.data;
}

export async function getProductoPublicoBySlug(id_empresa, slug) {
  const config = await getConfiguracionPublica(id_empresa);

  const [rows] = await pool.query(
    `
    SELECT
      p.id_producto, p.codigo, p.nombre, p.slug,
      p.descripcion_corta, p.descripcion_completa,
      p.precio_venta, p.precio_anterior, p.estado_disponibilidad,
      p.stock_actual, p.marca, p.color_estilo, p.material, p.unidad_medida,
      c.nombre AS categoria_nombre, c.slug AS categoria_slug
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.slug = ?
      AND p.id_empresa = ?
      AND p.activo = 1
      AND p.estado_publicacion = 'Publicado'
      AND c.activo = 1 AND c.estado = 1
    LIMIT 1
  `,
    [slug, id_empresa]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Producto no encontrado');
  }

  const p = rows[0];
  const [imagenes] = await pool.query(
    `
    SELECT imagen_url, es_principal, orden_visual, texto_alternativo
    FROM producto_imagenes
    WHERE id_producto = ? AND activo = 1
    ORDER BY es_principal DESC, orden_visual ASC
  `,
    [p.id_producto]
  );

  return {
    codigo: p.codigo,
    nombre: p.nombre,
    slug: p.slug,
    descripcion_corta: p.descripcion_corta,
    descripcion_completa: p.descripcion_completa,
    precio_venta: Number(p.precio_venta),
    precio_anterior:
      p.precio_anterior !== null ? Number(p.precio_anterior) : null,
    estado_disponibilidad: p.estado_disponibilidad,
    stock_visible: config.mostrar_stock_publico ? p.stock_actual : null,
    marca: p.marca,
    color_estilo: p.color_estilo,
    material: p.material,
    unidad_medida: p.unidad_medida,
    categoria: {
      nombre: p.categoria_nombre,
      slug: p.categoria_slug
    },
    imagenes: imagenes.map((img) => ({
      imagen_url: img.imagen_url,
      es_principal: !!img.es_principal,
      orden_visual: img.orden_visual,
      texto_alternativo: img.texto_alternativo
    }))
  };
}

export async function getRelacionados(id_empresa, slug, limite = 4) {
  const [base] = await pool.query(
    `
    SELECT p.id_producto, p.id_categoria
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE p.slug = ?
      AND p.id_empresa = ?
      AND p.activo = 1
      AND p.estado_publicacion = 'Publicado'
    LIMIT 1
  `,
    [slug, id_empresa]
  );

  if (!base.length) {
    throw new ApiError(404, 'Producto no encontrado');
  }

  const result = await listProductosPublicos(id_empresa, {
    categoria: base[0].id_categoria,
    limite,
    pagina: 1
  });

  return result.data.filter((item) => item.id_producto !== base[0].id_producto);
}

export default {
  listCategoriasPublicas,
  listProductosPublicos,
  listDestacados,
  listRecientes,
  getProductoPublicoBySlug,
  getRelacionados
};
