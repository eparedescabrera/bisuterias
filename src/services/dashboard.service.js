import * as repo from '../repositories/dashboard.repository.js';
import {
  resolvePeriodo,
  previousPeriod,
  pctChange
} from '../utils/datePeriod.js';

/** Compatibilidad Doc 3: resumen simple + Doc 7 con período */
export async function getResumen(query = {}) {
  const periodo = resolvePeriodo(query);
  const prev = previousPeriod(periodo.desde, periodo.hasta);

  const [stock, mov, movPrev] = await Promise.all([
    repo.kpiStock(),
    repo.sumMovimientos(periodo.desdeDT, periodo.hastaDT),
    repo.sumMovimientos(prev.desdeDT, prev.hastaDT)
  ]);

  return {
    periodo: {
      desde: periodo.desde,
      hasta: periodo.hasta,
      label: periodo.label
    },
    // Doc 3 flat keys (compat)
    total_productos: stock.productos_activos,
    productos_publicados: stock.productos_activos,
    stock_bajo: Number(stock.stock_bajo),
    agotados: Number(stock.agotados),
    valor_inventario: Number(stock.valor_venta),
    entradas_hoy: Number(mov.entradas),
    salidas_hoy: Number(mov.salidas),
    movimientos_mes: Number(mov.movimientos),
    // Doc 7 structure
    kpis: {
      productosActivos: Number(stock.productos_activos),
      unidadesInventario: Number(stock.unidades_inventario),
      stockBajo: Number(stock.stock_bajo),
      agotados: Number(stock.agotados),
      entradas: Number(mov.entradas),
      salidas: Number(mov.salidas),
      ajustes: Number(mov.ajustes_count),
      movimientos: Number(mov.movimientos),
      valorVenta: Number(stock.valor_venta),
      valorCosto: null
    },
    comparacion: {
      entradasPorcentaje: pctChange(Number(mov.entradas), Number(movPrev.entradas)),
      salidasPorcentaje: pctChange(Number(mov.salidas), Number(movPrev.salidas)),
      movimientosPorcentaje: pctChange(
        Number(mov.movimientos),
        Number(movPrev.movimientos)
      )
    },
    valorCostoMensaje: 'No disponible'
  };
}

export async function getMovimientosDiarios(query = {}) {
  const periodo = resolvePeriodo(query);
  return repo.movimientosDiarios(periodo.desdeDT, periodo.hastaDT);
}

export async function getStockCategoria() {
  return repo.stockPorCategoria();
}

export async function getTopProductos(query = {}) {
  const periodo = resolvePeriodo(query);
  const limite = Math.min(20, Math.max(1, Number(query.limite || 10)));
  return repo.topProductosSalidas(periodo.desdeDT, periodo.hastaDT, limite);
}

export async function getAlertasStock() {
  return repo.alertasStock();
}

export async function getUltimosMovimientos(limite = 10) {
  return repo.ultimosMovimientos(limite);
}

export async function getProductosPorCategoria() {
  return repo.stockPorCategoria();
}

export async function getSinMovimiento(query = {}) {
  return repo.sinMovimiento(query.dias);
}

export async function getMovimientosPorTipo(query = {}) {
  const periodo = resolvePeriodo(query);
  return repo.movimientosPorTipo(periodo.desdeDT, periodo.hastaDT);
}

export default {
  getResumen,
  getMovimientosDiarios,
  getStockCategoria,
  getTopProductos,
  getAlertasStock,
  getUltimosMovimientos,
  getProductosPorCategoria,
  getSinMovimiento,
  getMovimientosPorTipo
};
