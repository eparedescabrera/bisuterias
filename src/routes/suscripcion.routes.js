import { Router } from 'express';
import * as suscripcionController from '../controllers/suscripcion.controller.js';
import { body } from 'express-validator';
import validationMiddleware from '../middlewares/validation.middleware.js';

const router = Router();

router.get('/planes', suscripcionController.planes);

router.post(
  '/solicitar',
  [
    body('nombre_negocio').trim().isLength({ min: 2, max: 160 }),
    body('propietario').trim().isLength({ min: 2, max: 150 }),
    body('correo').trim().isEmail().isLength({ max: 150 }),
    body('telefono').trim().isLength({ min: 8, max: 30 }),
    body('password').isLength({ min: 10 }),
    body('plan').isIn(['Mensual', 'Trimestral', 'Anual']),
    body('direccion').optional({ nullable: true }).isLength({ max: 350 })
  ],
  validationMiddleware,
  suscripcionController.solicitar
);

export default router;
