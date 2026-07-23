import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller.js';
import {
  createMovimientoValidators,
  listMovimientoValidators
} from '../validators/inventario.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = Router();

router.get(
  '/movimientos',
  listMovimientoValidators,
  validationMiddleware,
  inventarioController.list
);

router.post(
  '/movimientos',
  createMovimientoValidators,
  validationMiddleware,
  inventarioController.create
);

router.get('/inventario/stock-bajo', inventarioController.stockBajo);

export default router;
