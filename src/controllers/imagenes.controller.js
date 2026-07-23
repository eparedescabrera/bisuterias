import * as imagenesService from '../services/imagenes.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const add = asyncHandler(async (req, res) => {
  const data = await imagenesService.addImagenes(
    Number(req.params.id),
    req.files || []
  );
  return success(res, data, 'Imágenes agregadas', 201);
});

export const addBase64 = asyncHandler(async (req, res) => {
  const images = req.body?.imagenes || req.body?.images || [];
  const data = await imagenesService.addImagenesBase64(
    Number(req.params.id),
    images
  );
  return success(res, data, 'Imágenes agregadas', 201);
});

export const remove = asyncHandler(async (req, res) => {
  await imagenesService.deleteImagen(
    Number(req.params.id),
    Number(req.params.idImagen)
  );
  return success(res, null, 'Imagen eliminada');
});

export const setPrincipal = asyncHandler(async (req, res) => {
  const data = await imagenesService.setImagenPrincipal(
    Number(req.params.id),
    Number(req.params.idImagen)
  );
  return success(res, data, 'Imagen principal actualizada');
});
