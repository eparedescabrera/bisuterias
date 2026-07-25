import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';
import { MOTIVOS_INVENTARIO } from '../utils/inventario.constants.js';

function computeStockNuevo(tipo, stockActual, cantidad) {
  switch (tipo) {
    case 'Entrada':
    case 'Ajuste positivo':
    case 'Devolucion':
    case 'Stock inicial':
      return stockActual + cantidad;
    case 'Salida':
    case 'Ajuste negativo':
      return stockActual - cantidad;
    case 'Correccion':
      return cantidad;
    default:
      throw new ApiError(400, 'Tipo de movimiento no permitido');
  }
}

function resolveDisponibilidad(stockNuevo, estadoActual) {
  if (estadoActual === 'Descontinuado' || estadoActual === 'Proximamente') {
    return estadoActual;
  }
  if (stockNuevo === 0) return 'Agotado';
  if (stockNuevo > 0 && estadoActual === 'Agotado') return 'Disponible';
  return estadoActual;
}

function assertMotivo(motivo) {
  const value = String(motivo || '').trim();
  if (!value) {
    throw new ApiError(400, 'El motivo es obligatorio');
  }
  if (!MOTIVOS_INVENTARIO.includes(value)) {
    throw new ApiError(
      400,
      `Motivo no permitido. Use: ${MOTIVOS_INVENTARIO.join(', ')}`
    );
  }
  return value;
}

export async function listMovimientos(id_empresa, query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['p.id_empresa = ?'];
  const params = [id_empresa];

  if (query.id_producto) {
    where.push('m.id_producto = ?');
    params.push(Number(query.id_producto));
  }
  if (query.tipo_movimiento) {
    where.push('m.tipo_movimiento = ?');
    params.push(query.tipo_movimiento);
  }
  if (query.id_usuario) {
    where.push('m.id_usuario = ?');
    params.push(Number(query.id_usuario));
  }

  const periodo = query.periodo;
  if (periodo === 'hoy') {
    where.push('DATE(m.fecha_movimiento) = CURDATE()');
  } else if (periodo === 'semana') {
    where.push('m.fecha_movimiento >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)');
  } else if (periodo === 'mes') {
    where.push(
      'YEAR(m.fecha_movimiento) = YEAR(CURDATE()) AND MONTH(m.fecha_movimiento) = MONTH(CURDATE())'
    );
  } else {
    if (query.fecha_desde) {
      where.push('DATE(m.fecha_movimiento) >= ?');
      params.push(query.fecha_desde);
    }
    if (query.fecha_hasta) {
      where.push('DATE(m.fecha_movimiento) <= ?');
      params.push(query.fecha_hasta);
    }
  }

  if (query.busqueda) {
    where.push('(p.nombre LIKE ? OR p.codigo LIKE ? OR m.motivo LIKE ?)');
    const like = `%${query.busqueda}%`;
    params.push(like, like, like);
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.query(
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
    SELECT m.id_movimiento, m.id_producto, p.codigo, p.nombre AS producto,
           m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_nuevo,
           m.motivo, m.referencia, m.fecha_movimiento,
           m.id_usuario, u.nombre_usuario, u.nombre_completo
    FROM movimientos_inventario m
    INNER JOIN productos p ON p.id_producto = m.id_producto
    INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
    WHERE ${whereSql}
    ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
    LIMIT ? OFFSET ?
  `,
    [...params, limite, offset]
  );

  return {
    data: rows,
    meta: buildMeta(countRows[0].total, pagina, limite)
  };
}

export async function crearMovimiento(id_empresa, payload, id_usuario) {
  const { id_producto, tipo_movimiento, cantidad, referencia = null } = payload;
  const motivo = assertMotivo(payload.motivo);

  if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
    throw new ApiError(400, 'La cantidad debe ser un entero mayor que cero');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT stock_actual, estado_disponibilidad, activo, codigo, nombre, stock_minimo
      FROM productos
      WHERE id_producto = ? AND id_empresa = ?
      FOR UPDATE
    `,
      [id_producto, id_empresa]
    );

    if (!rows.length || !rows[0].activo) {
      throw new ApiError(404, 'Producto no encontrado');
    }

    const producto = rows[0];
    const stock_anterior = producto.stock_actual;
    let stock_nuevo = computeStockNuevo(
      tipo_movimiento,
      stock_anterior,
      Number(cantidad)
    );

    if (stock_nuevo < 0) {
      throw new ApiError(409, 'Stock insuficiente', [], 'STOCK_INSUFFICIENT');
    }

    const cantidadRegistrada =
      tipo_movimiento === 'Correccion'
        ? Math.abs(stock_nuevo - stock_anterior) || Number(cantidad)
        : Number(cantidad);

    if (cantidadRegistrada <= 0) {
      throw new ApiError(400, 'La corrección no modifica el stock');
    }

    const estado_disponibilidad = resolveDisponibilidad(
      stock_nuevo,
      producto.estado_disponibilidad
    );

    await connection.query(
      `
      UPDATE productos
      SET stock_actual = ?, estado_disponibilidad = ?
      WHERE id_producto = ? AND id_empresa = ?
    `,
      [stock_nuevo, estado_disponibilidad, id_producto, id_empresa]
    );

    const [result] = await connection.query(
      `
      INSERT INTO movimientos_inventario
        (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id_producto,
        tipo_movimiento,
        cantidadRegistrada,
        stock_anterior,
        stock_nuevo,
        motivo,
        referencia || null,
        id_usuario
      ]
    );

    await connection.commit();

    return {
      id_movimiento: result.insertId,
      id_producto,
      codigo: producto.codigo,
      producto: producto.nombre,
      tipo_movimiento,
      cantidad: cantidadRegistrada,
      stock_anterior,
      stock_nuevo,
      stock_minimo: producto.stock_minimo,
      motivo,
      referencia: referencia || null,
      estado_disponibilidad,
      alerta_stock_bajo: stock_nuevo <= producto.stock_minimo
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listStockBajo(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT id_producto, codigo, nombre, stock_actual, stock_minimo,
           estado_disponibilidad, estado_publicacion
    FROM productos
    WHERE id_empresa = ? AND activo = 1 AND stock_actual <= stock_minimo
    ORDER BY stock_actual ASC, nombre ASC
  `,
    [id_empresa]
  );
  return rows;
}

export async function getProductoInventario(id_empresa, id_producto) {
  const [rows] = await pool.query(
    `
    SELECT id_producto, codigo, nombre, stock_actual, stock_minimo,
           estado_disponibilidad, estado_publicacion, activo
    FROM productos
    WHERE id_producto = ? AND id_empresa = ?
    LIMIT 1
  `,
    [id_producto, id_empresa]
  );
  if (!rows.length) {
    throw new ApiError(404, 'Producto no encontrado');
  }

  const kardex = await listMovimientos(id_empresa, {
    id_producto,
    pagina: 1,
    limite: 20
  });

  return {
    ...rows[0],
    alerta_stock_bajo: rows[0].stock_actual <= rows[0].stock_minimo,
    movimientos_recientes: kardex.data
  };
}

export default {
  crearMovimiento,
  listMovimientos,
  listStockBajo,
  getProductoInventario
};
