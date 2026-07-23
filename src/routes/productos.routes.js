import { Router } from 'express';
import * as productosController from '../controllers/productos.controller.js';
import {
  createProductoValidators,
  updateProductoValidators,
  listProductoValidators,
  patchPublicacionValidators,
  patchDestacadoValidators,
  patchDisponibilidadValidators
} from '../validators/producto.validators.js';
import { idParamValidator } from '../validators/categoria.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import { uploadProductImages } from '../middlewares/upload.middleware.js';

const router = Router();

/** Multer solo si el request es multipart; permite crear producto en JSON puro. */
function optionalProductUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return uploadProductImages(req, res, next);
  }
  return next();
}

function parseDatosMiddleware(req, _res, next) {
  if (req.body?.datos && typeof req.body.datos === 'string') {
    try {
      const parsed = JSON.parse(req.body.datos);
      req.body = { ...parsed, datos: req.body.datos };
    } catch {
      // controller will throw ApiError
    }
  }

  // Coerce string booleans/numbers from multipart
  if (typeof req.body.destacado === 'string') {
    req.body.destacado = req.body.destacado === 'true' || req.body.destacado === '1';
  }
  if (typeof req.body.personalizable === 'string') {
    req.body.personalizable =
      req.body.personalizable === 'true' || req.body.personalizable === '1';
  }
  if (req.body.id_categoria) req.body.id_categoria = Number(req.body.id_categoria);
  if (req.body.precio_venta !== undefined) {
    req.body.precio_venta = Number(req.body.precio_venta);
  }
  if (req.body.precio_anterior !== undefined && req.body.precio_anterior !== '' && req.body.precio_anterior !== 'null') {
    req.body.precio_anterior = Number(req.body.precio_anterior);
  } else if (req.body.precio_anterior === '' || req.body.precio_anterior === 'null') {
    req.body.precio_anterior = null;
  }
  if (req.body.stock_inicial !== undefined) {
    req.body.stock_inicial = Number(req.body.stock_inicial);
  }
  if (req.body.stock_minimo !== undefined) {
    req.body.stock_minimo = Number(req.body.stock_minimo);
  }

  next();
}

router.get(
  '/',
  listProductoValidators,
  validationMiddleware,
  productosController.list
);

router.get(
  '/:id',
  idParamValidator,
  validationMiddleware,
  productosController.getById
);

router.post(
  '/',
  optionalProductUpload,
  parseDatosMiddleware,
  createProductoValidators,
  validationMiddleware,
  productosController.create
);

router.put(
  '/:id',
  updateProductoValidators,
  validationMiddleware,
  productosController.update
);

router.delete(
  '/:id',
  idParamValidator,
  validationMiddleware,
  productosController.remove
);

router.patch(
  '/:id/publicacion',
  patchPublicacionValidators,
  validationMiddleware,
  productosController.patchPublicacion
);

router.patch(
  '/:id/destacado',
  patchDestacadoValidators,
  validationMiddleware,
  productosController.patchDestacado
);

router.patch(
  '/:id/disponibilidad',
  patchDisponibilidadValidators,
  validationMiddleware,
  productosController.patchDisponibilidad
);

export default router;
