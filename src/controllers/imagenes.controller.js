import * as imagenesService from '../services/imagenes.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getEmpresaId } from '../utils/tenant.js';

export const add = asyncHandler(async (req, res) => {
  const data = await imagenesService.addImagenes(
    Number(req.params.id),
    req.files || [],
    getEmpresaId(req)
  );
  return success(res, data, 'Imágenes agregadas', 201);
});

export const addBase64 = asyncHandler(async (req, res) => {
  const idEmpresa = getEmpresaId(req);
  const images = req.body?.imagenes || req.body?.images || [];
  const data = await imagenesService.addImagenesBase64(
    Number(req.params.id),
    images,
    idEmpresa
  );
  return success(res, data, 'Imágenes agregadas', 201);
});

export const remove = asyncHandler(async (req, res) => {
  await imagenesService.assertProductoDeEmpresa(
    getEmpresaId(req),
    Number(req.params.id)
  );
  await imagenesService.deleteImagen(
    Number(req.params.id),
    Number(req.params.idImagen)
  );
  return success(res, null, 'Imagen eliminada');
});

export const setPrincipal = asyncHandler(async (req, res) => {
  await imagenesService.assertProductoDeEmpresa(
    getEmpresaId(req),
    Number(req.params.id)
  );
  const data = await imagenesService.setImagenPrincipal(
    Number(req.params.id),
    Number(req.params.idImagen)
  );
  return success(res, data, 'Imagen principal actualizada');
});
