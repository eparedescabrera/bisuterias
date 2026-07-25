import * as publicService from '../services/public.service.js';
import { getConfiguracionPublica } from '../services/configuracion.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { resolveEmpresaPublica } from '../utils/resolveEmpresaPublica.js';

export const configuracion = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await getConfiguracionPublica(empresa.id_empresa);
  return success(res, data, 'Configuración pública');
});

export const categorias = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await publicService.listCategoriasPublicas(empresa.id_empresa);
  return success(res, data, 'Categorías públicas');
});

export const productos = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const result = await publicService.listProductosPublicos(
    empresa.id_empresa,
    req.query
  );
  return success(res, result.data, 'Catálogo público', 200, result.meta);
});

export const destacados = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await publicService.listDestacados(
    empresa.id_empresa,
    req.query.limite
  );
  return success(res, data, 'Productos destacados');
});

export const recientes = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await publicService.listRecientes(
    empresa.id_empresa,
    req.query.limite
  );
  return success(res, data, 'Productos recientes');
});

export const detalle = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await publicService.getProductoPublicoBySlug(
    empresa.id_empresa,
    req.params.slug
  );
  return success(res, data, 'Detalle del producto');
});

export const relacionados = asyncHandler(async (req, res) => {
  const empresa = await resolveEmpresaPublica(req);
  const data = await publicService.getRelacionados(
    empresa.id_empresa,
    req.params.slug,
    req.query.limite
  );
  return success(res, data, 'Productos relacionados');
});
