import { Router } from 'express';
import * as imagenesController from '../controllers/imagenes.controller.js';
import { idParamValidator } from '../validators/categoria.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import { uploadProductImages } from '../middlewares/upload.middleware.js';
import { param } from 'express-validator';

const router = Router({ mergeParams: true });

router.post('/', uploadProductImages, imagenesController.add);

router.delete(
  '/:idImagen',
  idParamValidator,
  param('idImagen').isInt({ min: 1 }),
  validationMiddleware,
  imagenesController.remove
);

router.patch(
  '/:idImagen/principal',
  idParamValidator,
  param('idImagen').isInt({ min: 1 }),
  validationMiddleware,
  imagenesController.setPrincipal
);

export default router;
