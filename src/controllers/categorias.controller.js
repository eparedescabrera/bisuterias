import * as categoriasService from '../services/categorias.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getEmpresaId } from '../utils/tenant.js';

export const list = asyncHandler(async (req, res) => {
  const idEmpresa = getEmpresaId(req);
  const result = await categoriasService.listCategorias(idEmpresa, req.query);
  return success(res, result.data, 'Categorías listadas', 200, result.meta);
});

export const getById = asyncHandler(async (req, res) => {
  const data = await categoriasService.getCategoriaById(
    getEmpresaId(req),
    Number(req.params.id)
  );
  return success(res, data, 'Categoría obtenida');
});

export const create = asyncHandler(async (req, res) => {
  const data = await categoriasService.createCategoria(getEmpresaId(req), req.body);
  return success(res, data, 'Categoría creada', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await categoriasService.updateCategoria(
    getEmpresaId(req),
    Number(req.params.id),
    req.body
  );
  return success(res, data, 'Categoría actualizada');
});

export const remove = asyncHandler(async (req, res) => {
  await categoriasService.deleteCategoria(getEmpresaId(req), Number(req.params.id));
  return success(res, null, 'Categoría desactivada');
});
