import pool from '../config/database.js';
import { TIPOS_ENTRADA, TIPOS_SALIDA } from '../utils/datePeriod.js';

export async function kpiStock(id_empresa) {
  const [[row]] = await pool.query(
    `
    SELECT
      COUNT(*) AS productos_activos,
      COALESCE(SUM(stock_actual), 0) AS unidades_inventario,
      SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) AS agotados,
      SUM(CASE WHEN stock_actual > 0 AND stock_actual <= stock_minimo THEN 1 ELSE 0 END) AS stock_bajo,
      COALESCE(SUM(stock_actual * precio_venta), 0) AS valor_venta
    FROM productos
    WHERE activo = 1 AND id_empresa = ?
  `,
    [id_empresa]
  );
  return row;
}

export async function sumMovimientos(id_empresa, desdeDT, hastaDT) {
  const [[row]] = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN m.tipo_movimiento IN (?) THEN m.cantidad ELSE 0 END), 0) AS entradas,
      COALESCE(SUM(CASE WHEN m.tipo_movimiento IN (?) THEN m.cantidad ELSE 0 END), 0) AS salidas,
      COUNT(*) AS movimientos,
      COALESCE(SUM(CASE WHEN m.tipo_movimiento IN ('Ajuste positivo','Ajuste negativo','Correccion') THEN m.cantidad ELSE 0 END), 0) AS ajustes_unidades,
      SUM(CASE WHEN m.tipo_movimiento IN ('Ajuste positivo','Ajuste negativo','Correccion') THEN 1 ELSE 0 END) AS ajustes_count
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    WHERE p.id_empresa = ? AND m.fecha_movimiento BETWEEN ? AND ?
  `,
    [TIPOS_ENTRADA, TIPOS_SALIDA, id_empresa, desdeDT, hastaDT]
  );
  return row;
}

export async function movimientosDiarios(id_empresa, desdeDT, hastaDT) {
  const [rows] = await pool.query(
    `
    SELECT DATE(m.fecha_movimiento) AS fecha,
           COALESCE(SUM(CASE WHEN m.tipo_movimiento IN (?) THEN m.cantidad ELSE 0 END), 0) AS entradas,
           COALESCE(SUM(CASE WHEN m.tipo_movimiento IN (?) THEN m.cantidad ELSE 0 END), 0) AS salidas
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    WHERE p.id_empresa = ? AND m.fecha_movimiento BETWEEN ? AND ?
    GROUP BY DATE(m.fecha_movimiento)
    ORDER BY fecha ASC
  `,
    [TIPOS_ENTRADA, TIPOS_SALIDA, id_empresa, desdeDT, hastaDT]
  );
  return rows.map((r) => ({
    fecha:
      r.fecha instanceof Date
        ? r.fecha.toISOString().slice(0, 10)
        : String(r.fecha).slice(0, 10),
    entradas: Number(r.entradas),
    salidas: Number(r.salidas)
  }));
}

export async function stockPorCategoria(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT c.id_categoria, c.nombre AS categoria,
           COALESCE(SUM(p.stock_actual), 0) AS unidades,
           COUNT(p.id_producto) AS productos
    FROM categorias c
    LEFT JOIN productos p
      ON p.id_categoria = c.id_categoria AND p.activo = 1 AND p.id_empresa = ?
    WHERE c.activo = 1 AND c.id_empresa = ?
    GROUP BY c.id_categoria, c.nombre
    ORDER BY unidades DESC, c.nombre ASC
  `,
    [id_empresa, id_empresa]
  );
  return rows.map((r) => ({
    id_categoria: r.id_categoria,
    categoria: r.categoria,
    unidades: Number(r.unidades),
    productos: Number(r.productos)
  }));
}

export async function topProductosSalidas(id_empresa, desdeDT, hastaDT, limite = 10) {
  const limit = Math.min(20, Math.max(1, Number(limite) || 10));
  const [rows] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre,
           COALESCE(SUM(m.cantidad), 0) AS unidades_salida,
           i.imagen_url
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    LEFT JOIN producto_imagenes i
      ON i.id_producto = p.id_producto AND i.es_principal = 1 AND i.activo = 1
    WHERE p.id_empresa = ?
      AND m.fecha_movimiento BETWEEN ? AND ?
      AND m.tipo_movimiento IN (?)
      AND p.activo = 1
    GROUP BY p.id_producto, p.codigo, p.nombre, i.imagen_url
    ORDER BY unidades_salida DESC
    LIMIT ?
  `,
    [id_empresa, desdeDT, hastaDT, TIPOS_SALIDA, limit]
  );
  return rows.map((r) => ({
    id_producto: r.id_producto,
    codigo: r.codigo,
    nombre: r.nombre,
    unidades_salida: Number(r.unidades_salida),
    imagen_url: r.imagen_url
  }));
}

export async function movimientosPorTipo(id_empresa, desdeDT, hastaDT) {
  const [rows] = await pool.query(
    `
    SELECT m.tipo_movimiento, COUNT(*) AS registros, COALESCE(SUM(m.cantidad), 0) AS unidades
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    WHERE p.id_empresa = ? AND m.fecha_movimiento BETWEEN ? AND ?
    GROUP BY m.tipo_movimiento
    ORDER BY unidades DESC
  `,
    [id_empresa, desdeDT, hastaDT]
  );
  return rows.map((r) => ({
    tipo_movimiento: r.tipo_movimiento,
    registros: Number(r.registros),
    unidades: Number(r.unidades)
  }));
}

export async function alertasStock(id_empresa) {
  const [bajo] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual, p.stock_minimo,
           c.nombre AS categoria, i.imagen_url
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN producto_imagenes i
      ON i.id_producto = p.id_producto AND i.es_principal = 1 AND i.activo = 1
    WHERE p.id_empresa = ? AND p.activo = 1
      AND p.stock_actual > 0 AND p.stock_actual <= p.stock_minimo
    ORDER BY p.stock_actual ASC
    LIMIT 50
  `,
    [id_empresa]
  );

  const [agotados] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual, p.stock_minimo,
           c.nombre AS categoria, i.imagen_url,
           (
             SELECT MAX(m.fecha_movimiento)
             FROM movimientos_inventario m
             WHERE m.id_producto = p.id_producto
               AND m.tipo_movimiento IN ('Salida','Ajuste negativo')
           ) AS ultima_salida
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN producto_imagenes i
      ON i.id_producto = p.id_producto AND i.es_principal = 1 AND i.activo = 1
    WHERE p.id_empresa = ? AND p.activo = 1 AND p.stock_actual = 0
    ORDER BY p.nombre ASC
    LIMIT 50
  `,
    [id_empresa]
  );

  return { stock_bajo: bajo, agotados };
}

export async function ultimosMovimientos(id_empresa, limite = 10) {
  const limit = Math.min(50, Math.max(1, Number(limite) || 10));
  const [rows] = await pool.query(
    `
    SELECT m.id_movimiento, m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_nuevo,
           m.motivo, m.fecha_movimiento, p.id_producto, p.nombre AS producto, p.codigo,
           u.nombre_usuario
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
    WHERE p.id_empresa = ?
    ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
    LIMIT ?
  `,
    [id_empresa, limit]
  );
  return rows;
}

export async function sinMovimiento(id_empresa, dias = 30) {
  const days = Math.min(365, Math.max(7, Number(dias) || 30));
  const [rows] = await pool.query(
    `
    SELECT p.id_producto, p.codigo, p.nombre, p.stock_actual,
           c.nombre AS categoria,
           DATEDIFF(CURDATE(), COALESCE(MAX(m.fecha_movimiento), p.fecha_creacion)) AS dias_sin_movimiento
    FROM productos p
    INNER JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN movimientos_inventario m ON m.id_producto = p.id_producto
    WHERE p.id_empresa = ? AND p.activo = 1 AND p.stock_actual > 0
    GROUP BY p.id_producto, p.codigo, p.nombre, p.stock_actual, c.nombre, p.fecha_creacion
    HAVING dias_sin_movimiento >= ?
    ORDER BY dias_sin_movimiento DESC
    LIMIT 50
  `,
    [id_empresa, days]
  );
  return rows;
}
