import * as configuracionService from '../services/configuracion.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getEmpresaId } from '../utils/tenant.js';

export const get = asyncHandler(async (req, res) => {
  const data = await configuracionService.getConfiguracionAdmin(getEmpresaId(req));
  return success(res, data, 'Configuración obtenida');
});

export const update = asyncHandler(async (req, res) => {
  const data = await configuracionService.updateConfiguracion(
    getEmpresaId(req),
    req.body
  );
  return success(res, data, 'Configuración actualizada');
});

export const uploadLogo = asyncHandler(async (req, res) => {
  const data = await configuracionService.uploadLogo(getEmpresaId(req), req.file);
  return success(res, data, 'Logo actualizado');
});

export const uploadPortada = asyncHandler(async (req, res) => {
  const data = await configuracionService.uploadPortada(getEmpresaId(req), req.file);
  return success(res, data, 'Portada actualizada');
});
