import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { getPlan } from '../config/plans.js';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function dashboardSuper() {
  const [[estados]] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(estado = 'Activa') AS activas,
      SUM(estado = 'Pendiente') AS pendientes,
      SUM(estado = 'Vencida') AS vencidas,
      SUM(estado = 'Suspendida') AS suspendidas
    FROM empresas WHERE activo = 1
  `);

  const [[mes]] = await pool.query(`
    SELECT COALESCE(SUM(monto), 0) AS ingresos_mes
    FROM suscripciones
    WHERE estado = 'Aceptada'
      AND YEAR(fecha_pago) = YEAR(CURDATE())
      AND MONTH(fecha_pago) = MONTH(CURDATE())
  `);

  const [[anio]] = await pool.query(`
    SELECT COALESCE(SUM(monto), 0) AS ingresos_anio
    FROM suscripciones
    WHERE estado = 'Aceptada'
      AND YEAR(fecha_pago) = YEAR(CURDATE())
  `);

  return {
    empresas: {
      total: Number(estados.total || 0),
      activas: Number(estados.activas || 0),
      pendientes: Number(estados.pendientes || 0),
      vencidas: Number(estados.vencidas || 0),
      suspendidas: Number(estados.suspendidas || 0)
    },
    ingresos_mensuales: Number(mes.ingresos_mes || 0),
    ingresos_anuales: Number(anio.ingresos_anio || 0)
  };
}

export async function listEmpresas({ estado, busqueda } = {}) {
  const where = ['e.activo = 1'];
  const params = [];
  if (estado) {
    where.push('e.estado = ?');
    params.push(estado);
  }
  if (busqueda) {
    where.push(
      '(e.nombre_negocio LIKE ? OR e.propietario LIKE ? OR e.correo LIKE ? OR e.telefono LIKE ?)'
    );
    const like = `%${busqueda}%`;
    params.push(like, like, like, like);
  }

  const [rows] = await pool.query(
    `
    SELECT e.id_empresa, e.nombre_negocio, e.slug, e.propietario, e.telefono,
           e.correo, e.plan, e.estado, e.fecha_registro, e.fecha_vencimiento,
           e.observaciones
    FROM empresas e
    WHERE ${where.join(' AND ')}
    ORDER BY e.fecha_registro DESC
  `,
    params
  );
  return rows;
}

export async function getEmpresa(id) {
  const [rows] = await pool.query(
    `
    SELECT * FROM empresas WHERE id_empresa = ? AND activo = 1 LIMIT 1
  `,
    [id]
  );
  if (!rows.length) throw new ApiError(404, 'Empresa no encontrada');

  const [subs] = await pool.query(
    `
    SELECT * FROM suscripciones
    WHERE id_empresa = ?
    ORDER BY fecha_pago DESC
    LIMIT 20
  `,
    [id]
  );

  return { ...rows[0], suscripciones: subs };
}

export async function updateEmpresa(id, payload) {
  await getEmpresa(id);
  const fields = [];
  const params = [];
  for (const key of [
    'nombre_negocio',
    'propietario',
    'telefono',
    'correo',
    'direccion',
    'plan',
    'observaciones',
    'fecha_vencimiento'
  ]) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(payload[key]);
    }
  }
  if (!fields.length) throw new ApiError(400, 'Sin cambios');
  params.push(id);
  await pool.query(
    `UPDATE empresas SET ${fields.join(', ')} WHERE id_empresa = ?`,
    params
  );
  return getEmpresa(id);
}

export async function setEstadoEmpresa(id, estado) {
  if (!['Pendiente', 'Activa', 'Suspendida', 'Vencida'].includes(estado)) {
    throw new ApiError(400, 'Estado inválido');
  }
  await getEmpresa(id);
  await pool.query(`UPDATE empresas SET estado = ? WHERE id_empresa = ?`, [
    estado,
    id
  ]);
  return getEmpresa(id);
}

export async function renovarEmpresa(id, { plan } = {}) {
  const empresa = await getEmpresa(id);
  const planName = plan || empresa.plan;
  const planMeta = getPlan(planName);
  if (!planMeta) throw new ApiError(400, 'Plan inválido');

  const inicio = new Date().toISOString().slice(0, 10);
  const fin = addDays(inicio, planMeta.dias);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `
      INSERT INTO suscripciones
        (id_empresa, monto, metodo_pago, fecha_pago, fecha_inicio, fecha_fin, estado)
      VALUES (?, ?, 'SINPE', NOW(), ?, ?, 'Aceptada')
    `,
      [id, planMeta.monto, inicio, fin]
    );
    await connection.query(
      `
      UPDATE empresas
      SET estado = 'Activa', plan = ?, fecha_vencimiento = ?
      WHERE id_empresa = ?
    `,
      [planName, fin, id]
    );
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  return getEmpresa(id);
}

export async function eliminarEmpresa(id) {
  await getEmpresa(id);
  await pool.query(
    `UPDATE empresas SET activo = 0, estado = 'Suspendida' WHERE id_empresa = ?`,
    [id]
  );
  return true;
}

export default {
  dashboardSuper,
  listEmpresas,
  getEmpresa,
  updateEmpresa,
  setEstadoEmpresa,
  renovarEmpresa,
  eliminarEmpresa
};
