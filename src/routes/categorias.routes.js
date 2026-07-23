import { Router } from 'express';
import * as categoriasController from '../controllers/categorias.controller.js';
import {
  createCategoriaValidators,
  updateCategoriaValidators,
  idParamValidator,
  listCategoriaValidators
} from '../validators/categoria.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = Router();

router.get(
  '/',
  listCategoriaValidators,
  validationMiddleware,
  categoriasController.list
);

router.get(
  '/:id',
  idParamValidator,
  validationMiddleware,
  categoriasController.getById
);

router.post(
  '/',
  createCategoriaValidators,
  validationMiddleware,
  categoriasController.create
);

router.put(
  '/:id',
  updateCategoriaValidators,
  validationMiddleware,
  categoriasController.update
);

router.delete(
  '/:id',
  idParamValidator,
  validationMiddleware,
  categoriasController.remove
);

export default router;
