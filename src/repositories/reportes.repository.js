import pool from '../config/database.js';
import { TIPOS_ENTRADA, TIPOS_SALIDA, TIPOS_AJUSTE } from '../utils/datePeriod.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

function mapTipoGrupo(tipo) {
  if (!tipo) return null;
  const t = String(tipo).toUpperCase();
  if (t === 'ENTRADA' || t === 'ENTRADAS') return TIPOS_ENTRADA;
  if (t === 'SALIDA' || t === 'SALIDAS') return TIPOS_SALIDA;
  if (t === 'AJUSTE' || t === 'AJUSTES') return TIPOS_AJUSTE;
  return [tipo];
}

export async function inventarioActual(id_empresa, query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['p.activo = 1', 'p.id_empresa = ?'];
  const params = [id_empresa];

  if (query.id_categoria || query.categoriaId) {
    where.push('p.id_categoria = ?');
    params.push(Number(query.id_categoria || query.categoriaId));
  }
  if (query.busqueda) {
    where.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
    const like = `%${query.busqueda}%`;
    params.push(like, like);
  }
  if (query.stock === 'agotado') where.push('p.stock_actual = 0');
  if (query.stock === 'bajo') {
    where.push('p.stock_actual > 0 AND p.stock_actual <= p.stock_minimo');
  }
  if (query.stock === 'normal') {
    where.push('p.stock_actual > p.stock_minimo');
  }

  const whereSql = where.join(' AND ');
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM productos p WHERE ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual, p.stock_minimo,
           p.precio_venta, p.estado_disponibilidad, p.estado_publicacion,
           c.nombre AS categoria, i.imagen_url,
           (p.stock_actual * p.precio_venta) AS valor_venta
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN producto_imagenes i
      ON i.id_producto = p.id_producto AND i.es_principal = 1 AND i.activo = 1
    WHERE ${whereSql}
    ORDER BY p.nombre ASC
    LIMIT ${Number(limite)} OFFSET ${Number(offset)}
  `,
    params
  );

  return {
    data: rows.map((r) => ({
      ...r,
      precio_venta: Number(r.precio_venta),
      valor_venta: Number(r.valor_venta),
      valor_costo: null,
      utilidad_potencial: null
    })),
    meta: buildMeta(count.total, pagina, limite)
  };
}

export async function kardex(id_empresa, query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['p.id_empresa = ?'];
  const params = [id_empresa];

  if (query.desdeDT && query.hastaDT) {
    where.push('m.fecha_movimiento BETWEEN ? AND ?');
    params.push(query.desdeDT, query.hastaDT);
  }
  if (query.id_producto || query.productoId) {
    where.push('m.id_producto = ?');
    params.push(Number(query.id_producto || query.productoId));
  }
  if (query.id_usuario || query.usuarioId) {
    where.push('m.id_usuario = ?');
    params.push(Number(query.id_usuario || query.usuarioId));
  }
  if (query.id_categoria || query.categoriaId) {
    where.push('p.id_categoria = ?');
    params.push(Number(query.id_categoria || query.categoriaId));
  }
  if (query.motivo) {
    where.push('m.motivo = ?');
    params.push(query.motivo);
  }
  const tipos = mapTipoGrupo(query.tipo || query.tipo_movimiento);
  if (tipos) {
    where.push('m.tipo_movimiento IN (?)');
    params.push(tipos);
  }
  if (query.busqueda) {
    where.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
    const like = `%${query.busqueda}%`;
    params.push(like, like);
  }

  const whereSql = where.join(' AND ');
  const [[count]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    WHERE ${whereSql}
  `,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT m.id_movimiento, m.fecha_movimiento, m.tipo_movimiento, m.cantidad,
           m.stock_anterior, m.stock_nuevo, m.motivo, m.referencia,
           p.id_producto, p.codigo, p.nombre AS producto,
           u.id_usuario, u.nombre_usuario
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
    WHERE ${whereSql}
    ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
    LIMIT ${Number(limite)} OFFSET ${Number(offset)}
  `,
    params
  );

  return { data: rows, meta: buildMeta(count.total, pagina, limite) };
}

export async function rotacion(id_empresa, query = {}) {
  const { desdeDT, hastaDT } = query;
  const dias = Math.min(365, Math.max(7, Number(query.dias || 30)));

  const [alta] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual,
           c.nombre AS categoria,
           COALESCE(SUM(m.cantidad), 0) AS unidades_salida
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN movimientos_inventario m
      ON m.id_producto = p.id_producto
     AND m.fecha_movimiento BETWEEN ? AND ?
     AND m.tipo_movimiento IN (?)
    WHERE p.activo = 1 AND p.id_empresa = ?
    GROUP BY p.id_producto, p.codigo, p.nombre, p.stock_actual, c.nombre
    HAVING unidades_salida > 0
    ORDER BY unidades_salida DESC
    LIMIT 20
  `,
    [desdeDT, hastaDT, TIPOS_SALIDA, id_empresa]
  );

  const [baja] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual,
           c.nombre AS categoria,
           DATEDIFF(CURDATE(), COALESCE(MAX(m.fecha_movimiento), p.fecha_creacion)) AS dias_sin_salida
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN movimientos_inventario m
      ON m.id_producto = p.id_producto
     AND m.tipo_movimiento IN (?)
    WHERE p.activo = 1 AND p.stock_actual > 0 AND p.id_empresa = ?
    GROUP BY p.id_producto, p.codigo, p.nombre, p.stock_actual, c.nombre, p.fecha_creacion
    HAVING dias_sin_salida >= ?
    ORDER BY dias_sin_salida DESC
    LIMIT 20
  `,
    [TIPOS_SALIDA, id_empresa, dias]
  );

  return {
    alta_rotacion: alta.map((r) => ({
      ...r,
      unidades_salida: Number(r.unidades_salida)
    })),
    baja_rotacion: baja,
    dias_sin_movimiento: dias,
    nota: 'costo_unitario no existe en Documento 2; utilidad potencial no disponible'
  };
}

export async function valoracion(id_empresa) {
  const [[row]] = await pool.query(
    `
    SELECT
      COALESCE(SUM(stock_actual * precio_venta), 0) AS valor_venta,
      COUNT(*) AS productos_activos,
      COALESCE(SUM(stock_actual), 0) AS unidades
    FROM productos
    WHERE activo = 1 AND id_empresa = ?
  `,
    [id_empresa]
  );

  return {
    valor_venta: Number(row.valor_venta),
    valor_costo: null,
    utilidad_potencial: null,
    productos_activos: row.productos_activos,
    unidades: Number(row.unidades),
    valor_costo_mensaje: 'No disponible',
    dependencia: 'La tabla productos (Documento 2) no incluye costo_unitario'
  };
}

export async function ajustes(id_empresa, query = {}) {
  return kardex(id_empresa, {
    ...query,
    tipo: 'AJUSTE'
  });
}

export async function inventarioPorCategoria(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT c.id_categoria, c.nombre AS categoria,
           COUNT(p.id_producto) AS productos,
           COALESCE(SUM(p.stock_actual), 0) AS unidades,
           COALESCE(SUM(p.stock_actual * p.precio_venta), 0) AS valor_venta
    FROM categorias c
    LEFT JOIN productos p
      ON p.id_categoria = c.id_categoria AND p.activo = 1 AND p.id_empresa = ?
    WHERE c.activo = 1 AND c.id_empresa = ?
    GROUP BY c.id_categoria, c.nombre
    ORDER BY unidades DESC
  `,
    [id_empresa, id_empresa]
  );
  return rows.map((r) => ({
    ...r,
    unidades: Number(r.unidades),
    valor_venta: Number(r.valor_venta),
    valor_costo: null
  }));
}

export async function getNegocio(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT nombre_negocio, moneda
    FROM configuracion_negocio
    WHERE id_empresa = ?
    LIMIT 1
  `,
    [id_empresa]
  );
  return rows[0] || { nombre_negocio: 'Inventory Pro', moneda: 'CRC' };
}
