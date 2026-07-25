import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../middlewares/empresa.middleware.js';
import * as ctrl from '../controllers/superAdmin.controller.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);

router.get('/dashboard', ctrl.dashboard);
router.get('/empresas', ctrl.empresas);
router.get('/empresas/:id', ctrl.empresa);
router.put('/empresas/:id', ctrl.updateEmpresa);
router.patch('/empresas/:id/activar', ctrl.activar);
router.patch('/empresas/:id/suspender', ctrl.suspender);
router.post('/empresas/:id/renovar', ctrl.renovar);
router.delete('/empresas/:id', ctrl.eliminar);

export default router;
