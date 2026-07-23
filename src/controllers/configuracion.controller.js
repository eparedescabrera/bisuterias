import * as configuracionService from '../services/configuracion.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const get = asyncHandler(async (_req, res) => {
  const data = await configuracionService.getConfiguracionAdmin();
  return success(res, data, 'Configuración obtenida');
});

export const update = asyncHandler(async (req, res) => {
  const data = await configuracionService.updateConfiguracion(req.body);
  return success(res, data, 'Configuración actualizada');
});

export const uploadLogo = asyncHandler(async (req, res) => {
  const data = await configuracionService.uploadLogo(req.file);
  return success(res, data, 'Logo actualizado');
});

export const uploadPortada = asyncHandler(async (req, res) => {
  const data = await configuracionService.uploadPortada(req.file);
  return success(res, data, 'Portada actualizada');
});
