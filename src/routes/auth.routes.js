import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import {
  loginValidators,
  changePasswordValidators
} from '../validators/auth.validators.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loginRateLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

router.post(
  '/login',
  loginRateLimiter,
  loginValidators,
  validationMiddleware,
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', authenticate, authController.logout);

router.get('/perfil', authenticate, authController.perfil);
router.get('/me', authenticate, authController.me);

router.put(
  '/cambiar-password',
  authenticate,
  changePasswordValidators,
  validationMiddleware,
  authController.cambiarPassword
);

router.patch(
  '/change-password',
  authenticate,
  changePasswordValidators,
  validationMiddleware,
  authController.cambiarPassword
);

export default router;
