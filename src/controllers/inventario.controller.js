import * as inventarioService from '../services/inventario.service.js';
import * as auditoria from '../repositories/auditoria.repository.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getClientIp, getUserAgent } from '../config/security.js';
import { getEmpresaId } from '../utils/tenant.js';

export const list = asyncHandler(async (req, res) => {
  const result = await inventarioService.listMovimientos(
    getEmpresaId(req),
    req.query
  );
  return success(res, result.data, 'Movimientos listados', 200, result.meta);
});

export const create = asyncHandler(async (req, res) => {
  const data = await inventarioService.crearMovimiento(
    getEmpresaId(req),
    req.body,
    req.user.id_usuario
  );

  await auditoria.registrar({
    id_usuario: req.user.id_usuario,
    accion: 'movimiento_inventario',
    recurso: 'movimientos_inventario',
    recurso_id: data.id_movimiento,
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req),
    metadata: {
      tipo_movimiento: data.tipo_movimiento,
      id_producto: data.id_producto,
      cantidad: data.cantidad
    }
  });

  return success(res, data, 'Movimiento registrado', 201);
});

export const stockBajo = asyncHandler(async (req, res) => {
  const data = await inventarioService.listStockBajo(getEmpresaId(req));
  return success(res, data, 'Productos con stock bajo');
});
