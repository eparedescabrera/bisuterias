import { Router } from 'express';
import * as auditoriaController from '../controllers/auditoria.controller.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.get('/auditoria', auditoriaController.listar);
router.post('/sessions/revoke-all', authController.revokeAll);

export default router;
