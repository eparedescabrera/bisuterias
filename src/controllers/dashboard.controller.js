import * as dashboardService from '../services/dashboard.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getEmpresaId } from '../utils/tenant.js';

export const resumen = asyncHandler(async (req, res) => {
  const data = await dashboardService.getResumen(getEmpresaId(req), req.query);
  return success(res, data, 'Resumen obtenido correctamente');
});

export const movimientosDiarios = asyncHandler(async (req, res) => {
  const data = await dashboardService.getMovimientosDiarios(
    getEmpresaId(req),
    req.query
  );
  return success(res, data, 'Movimientos diarios');
});

export const stockCategoria = asyncHandler(async (req, res) => {
  const data = await dashboardService.getStockCategoria(getEmpresaId(req));
  return success(res, data, 'Stock por categoría');
});

export const productosCategoria = asyncHandler(async (req, res) => {
  const data = await dashboardService.getProductosPorCategoria(getEmpresaId(req));
  return success(
    res,
    data.map((r) => ({
      ...r,
      total: r.productos,
      unidades: r.unidades
    })),
    'Productos por categoría'
  );
});

export const topProductos = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTopProductos(getEmpresaId(req), req.query);
  return success(res, data, 'Top productos');
});

export const alertasStock = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAlertasStock(getEmpresaId(req));
  return success(res, data, 'Alertas de stock');
});

export const ultimosMovimientos = asyncHandler(async (req, res) => {
  const data = await dashboardService.getUltimosMovimientos(
    getEmpresaId(req),
    req.query.limite
  );
  return success(res, data, 'Últimos movimientos');
});

export const sinMovimiento = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSinMovimiento(getEmpresaId(req), req.query);
  return success(res, data, 'Productos sin movimiento');
});

export const movimientosPorTipo = asyncHandler(async (req, res) => {
  const data = await dashboardService.getMovimientosPorTipo(
    getEmpresaId(req),
    req.query
  );
  return success(res, data, 'Movimientos por tipo');
});
