import * as suscripcionService from '../services/suscripcion.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const planes = asyncHandler(async (_req, res) => {
  return success(res, suscripcionService.getPlanesPublicos());
});

export const solicitar = asyncHandler(async (req, res) => {
  const data = await suscripcionService.solicitarSuscripcion(req.body);
  return success(res, data, 'Solicitud registrada', 201);
});

export default { planes, solicitar };
