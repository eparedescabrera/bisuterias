import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';
import categoriasRoutes from './categorias.routes.js';
import productosRoutes from './productos.routes.js';
import imagenesRoutes from './imagenes.routes.js';
import inventarioRoutes from './inventario.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportesRoutes from './reportes.routes.js';
import configuracionRoutes from './configuracion.routes.js';
import seguridadRoutes from './seguridad.routes.js';

const router = Router();

// CSRF no aplica cross-origin (Vercel→Railway). Protección: JWT + rol + CORS.
router.use(authMiddleware, requireAdmin);

router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/productos/:id/imagenes', imagenesRoutes);
router.use('/', inventarioRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reportesRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/', seguridadRoutes);

export default router;
