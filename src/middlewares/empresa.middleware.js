import ApiError from '../utils/ApiError.js';
import pool from '../config/database.js';
import { isSuperAdmin } from '../utils/tenant.js';

/**
 * Exige empresa Activa. Si la fecha de vencimiento pasó, marca Vencida.
 * Super Admin no pasa por aquí.
 */
export async function requireEmpresaActiva(req, _res, next) {
  try {
    if (isSuperAdmin(req.user)) {
      throw new ApiError(
        403,
        'El Super Administrador debe usar el panel /api/super-admin',
        [],
        'FORBIDDEN'
      );
    }

    const idEmpresa = req.user?.id_empresa;
    if (!idEmpresa) {
      throw new ApiError(403, 'Usuario sin empresa asignada', [], 'FORBIDDEN');
    }

    const [rows] = await pool.query(
      `
      SELECT id_empresa, estado, fecha_vencimiento, nombre_negocio
      FROM empresas
      WHERE id_empresa = ? AND activo = 1
      LIMIT 1
    `,
      [idEmpresa]
    );

    if (!rows.length) {
      throw new ApiError(403, 'Empresa no encontrada', [], 'FORBIDDEN');
    }

    const empresa = rows[0];

    if (
      empresa.estado === 'Activa' &&
      empresa.fecha_vencimiento &&
      new Date(`${empresa.fecha_vencimiento}T23:59:59`) < new Date()
    ) {
      await pool.query(
        `UPDATE empresas SET estado = 'Vencida' WHERE id_empresa = ?`,
        [idEmpresa]
      );
      empresa.estado = 'Vencida';
    }

    if (empresa.estado === 'Pendiente') {
      throw new ApiError(
        403,
        'Tu pago está siendo validado.',
        [],
        'EMPRESA_PENDIENTE'
      );
    }
    if (empresa.estado === 'Suspendida') {
      throw new ApiError(
        403,
        'Tu cuenta se encuentra suspendida.',
        [],
        'EMPRESA_SUSPENDIDA'
      );
    }
    if (empresa.estado === 'Vencida') {
      throw new ApiError(
        403,
        'Tu suscripción venció. Realiza nuevamente el pago por SINPE.',
        [],
        'EMPRESA_VENCIDA'
      );
    }
    if (empresa.estado !== 'Activa') {
      throw new ApiError(403, 'Empresa no autorizada', [], 'FORBIDDEN');
    }

    req.empresa = empresa;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireSuperAdmin(req, _res, next) {
  if (!isSuperAdmin(req.user)) {
    return next(
      new ApiError(403, 'Solo el Super Administrador puede acceder', [], 'FORBIDDEN')
    );
  }
  next();
}

export default { requireEmpresaActiva, requireSuperAdmin };
