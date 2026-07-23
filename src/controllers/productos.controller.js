import * as productosService from '../services/productos.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

function parseProductoBody(req) {
  if (req.body.datos) {
    try {
      return typeof req.body.datos === 'string'
        ? JSON.parse(req.body.datos)
        : req.body.datos;
    } catch {
      throw new ApiError(400, 'El campo datos debe ser un JSON válido');
    }
  }
  return req.body;
}

export const list = asyncHandler(async (req, res) => {
  const result = await productosService.listProductos(req.query);
  return success(res, result.data, 'Productos listados', 200, result.meta);
});

export const getById = asyncHandler(async (req, res) => {
  const data = await productosService.getProductoAdminById(
    Number(req.params.id)
  );
  return success(res, data, 'Producto obtenido');
});

export const create = asyncHandler(async (req, res) => {
  const payload = parseProductoBody(req);
  const data = await productosService.createProducto(
    payload,
    req.files || [],
    req.user.id_usuario
  );
  return success(res, data, 'Producto creado', 201);
});

export const update = asyncHandler(async (req, res) => {
  const payload = parseProductoBody(req);
  const data = await productosService.updateProducto(
    Number(req.params.id),
    payload
  );
  return success(res, data, 'Producto actualizado');
});

export const remove = asyncHandler(async (req, res) => {
  await productosService.deleteProducto(Number(req.params.id));
  return success(res, null, 'Producto desactivado');
});

export const patchPublicacion = asyncHandler(async (req, res) => {
  const data = await productosService.patchPublicacion(
    Number(req.params.id),
    req.body.estado_publicacion
  );
  return success(res, data, 'Publicación actualizada');
});

export const patchDestacado = asyncHandler(async (req, res) => {
  const data = await productosService.patchDestacado(
    Number(req.params.id),
    req.body.destacado
  );
  return success(res, data, 'Destacado actualizado');
});

export const patchDisponibilidad = asyncHandler(async (req, res) => {
  const data = await productosService.patchDisponibilidad(
    Number(req.params.id),
    req.body.estado_disponibilidad
  );
  return success(res, data, 'Disponibilidad actualizada');
});
