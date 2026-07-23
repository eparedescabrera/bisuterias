import { Router } from 'express';
import * as configuracionController from '../controllers/configuracion.controller.js';
import { updateConfiguracionValidators } from '../validators/configuracion.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/', configuracionController.get);

router.put(
  '/',
  updateConfiguracionValidators,
  validationMiddleware,
  configuracionController.update
);

router.post(
  '/logo',
  uploadSingleImage('logo'),
  configuracionController.uploadLogo
);

router.post(
  '/portada',
  uploadSingleImage('portada'),
  configuracionController.uploadPortada
);

export default router;
