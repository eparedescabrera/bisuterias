import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/resumen', dashboardController.resumen);
router.get('/movimientos-diarios', dashboardController.movimientosDiarios);
router.get('/stock-categoria', dashboardController.stockCategoria);
router.get('/productos-categoria', dashboardController.productosCategoria);
router.get('/top-productos', dashboardController.topProductos);
router.get('/alertas-stock', dashboardController.alertasStock);
router.get('/ultimos-movimientos', dashboardController.ultimosMovimientos);
router.get('/sin-movimiento', dashboardController.sinMovimiento);
router.get('/movimientos-tipo', dashboardController.movimientosPorTipo);

export default router;
