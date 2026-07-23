import * as reportesService from '../services/reportes.service.js';
import * as auditoria from '../repositories/auditoria.repository.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getClientIp, getUserAgent } from '../config/security.js';

export const inventario = asyncHandler(async (req, res) => {
  const result = await reportesService.inventario(req.query);
  return success(res, result.data, 'Inventario actual', 200, result.meta);
});

export const kardex = asyncHandler(async (req, res) => {
  const result = await reportesService.kardex(req.query);
  return success(res, result.data, 'Kardex obtenido', 200, result.meta);
});

export const rotacion = asyncHandler(async (req, res) => {
  const data = await reportesService.rotacion(req.query);
  return success(res, data, 'Rotación de productos');
});

export const valoracion = asyncHandler(async (_req, res) => {
  const data = await reportesService.valoracion();
  return success(res, data, 'Valoración de inventario');
});

export const ajustes = asyncHandler(async (req, res) => {
  const result = await reportesService.ajustes(req.query);
  return success(res, result.data, 'Ajustes y diferencias', 200, result.meta);
});

export const porCategoria = asyncHandler(async (_req, res) => {
  const data = await reportesService.porCategoria();
  return success(res, data, 'Inventario por categoría');
});

export const exportar = asyncHandler(async (req, res) => {
  await auditoria.registrar({
    id_usuario: req.user?.id_usuario || null,
    accion: 'exportacion_reporte',
    recurso: 'reportes',
    resultado: 'ok',
    ip: getClientIp(req),
    user_agent: getUserAgent(req),
    metadata: {
      reporte: req.query.reporte,
      formato: req.query.formato,
      desde: req.query.desde,
      hasta: req.query.hasta
    }
  });

  const file = await reportesService.exportar(req.query, req.user);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.filename}"`
  );
  return res.send(file.buffer);
});
