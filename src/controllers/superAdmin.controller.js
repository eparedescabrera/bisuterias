import * as superAdminService from '../services/superAdmin.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const dashboard = asyncHandler(async (_req, res) => {
  const data = await superAdminService.dashboardSuper();
  return success(res, data);
});

export const empresas = asyncHandler(async (req, res) => {
  const data = await superAdminService.listEmpresas(req.query);
  return success(res, data);
});

export const empresa = asyncHandler(async (req, res) => {
  const data = await superAdminService.getEmpresa(Number(req.params.id));
  return success(res, data);
});

export const updateEmpresa = asyncHandler(async (req, res) => {
  const data = await superAdminService.updateEmpresa(Number(req.params.id), req.body);
  return success(res, data, 'Empresa actualizada');
});

/** Activar tras verificar SINPE físicamente: crea suscripción + fecha vencimiento */
export const activar = asyncHandler(async (req, res) => {
  const data = await superAdminService.renovarEmpresa(Number(req.params.id), req.body);
  return success(res, data, 'Empresa activada');
});

export const suspender = asyncHandler(async (req, res) => {
  const data = await superAdminService.setEstadoEmpresa(
    Number(req.params.id),
    'Suspendida'
  );
  return success(res, data, 'Empresa suspendida');
});

export const renovar = asyncHandler(async (req, res) => {
  const data = await superAdminService.renovarEmpresa(Number(req.params.id), req.body);
  return success(res, data, 'Suscripción renovada');
});

export const eliminar = asyncHandler(async (req, res) => {
  await superAdminService.eliminarEmpresa(Number(req.params.id));
  return success(res, null, 'Empresa eliminada');
});

export default {
  dashboard,
  empresas,
  empresa,
  updateEmpresa,
  activar,
  suspender,
  renovar,
  eliminar
};
