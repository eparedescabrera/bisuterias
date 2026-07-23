import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as reportesController from '../controllers/reportes.controller.js';
import {
  filtrosReporte,
  exportarValidator
} from '../validators/reportes.validator.js';
import validate from '../middlewares/validation.middleware.js';

const router = Router();

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas exportaciones. Intente más tarde.'
  }
});

router.get(
  '/inventario',
  filtrosReporte,
  validate,
  reportesController.inventario
);
router.get('/kardex', filtrosReporte, validate, reportesController.kardex);
router.get('/rotacion', filtrosReporte, validate, reportesController.rotacion);
router.get('/valoracion', reportesController.valoracion);
router.get('/ajustes', filtrosReporte, validate, reportesController.ajustes);
router.get('/por-categoria', reportesController.porCategoria);
router.get(
  '/exportar',
  exportLimiter,
  exportarValidator,
  validate,
  reportesController.exportar
);

export default router;
