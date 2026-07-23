import { Router } from 'express';
import * as publicController from '../controllers/public.controller.js';

const router = Router();

router.get('/configuracion', publicController.configuracion);
router.get('/categorias', publicController.categorias);
router.get('/productos', publicController.productos);
router.get('/productos/destacados', publicController.destacados);
router.get('/productos/recientes', publicController.recientes);
router.get('/productos/:slug', publicController.detalle);
router.get('/productos/:slug/relacionados', publicController.relacionados);

export default router;
