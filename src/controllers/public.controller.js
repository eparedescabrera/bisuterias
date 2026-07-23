import * as publicService from '../services/public.service.js';
import { getConfiguracionPublica } from '../services/configuracion.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const configuracion = asyncHandler(async (_req, res) => {
  const data = await getConfiguracionPublica();
  return success(res, data, 'Configuración pública');
});

export const categorias = asyncHandler(async (_req, res) => {
  const data = await publicService.listCategoriasPublicas();
  return success(res, data, 'Categorías públicas');
});

export const productos = asyncHandler(async (req, res) => {
  const result = await publicService.listProductosPublicos(req.query);
  return success(res, result.data, 'Catálogo público', 200, result.meta);
});

export const destacados = asyncHandler(async (req, res) => {
  const data = await publicService.listDestacados(req.query.limite);
  return success(res, data, 'Productos destacados');
});

export const recientes = asyncHandler(async (req, res) => {
  const data = await publicService.listRecientes(req.query.limite);
  return success(res, data, 'Productos recientes');
});

export const detalle = asyncHandler(async (req, res) => {
  const data = await publicService.getProductoPublicoBySlug(req.params.slug);
  return success(res, data, 'Detalle del producto');
});

export const relacionados = asyncHandler(async (req, res) => {
  const data = await publicService.getRelacionados(
    req.params.slug,
    req.query.limite
  );
  return success(res, data, 'Productos relacionados');
});
