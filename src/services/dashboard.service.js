import * as repo from '../repositories/dashboard.repository.js';
import {
  resolvePeriodo,
  previousPeriod,
  pctChange
} from '../utils/datePeriod.js';

export async function getResumen(id_empresa, query = {}) {
  const periodo = resolvePeriodo(query);
  const prev = previousPeriod(periodo.desde, periodo.hasta);

  const [stock, mov, movPrev] = await Promise.all([
    repo.kpiStock(id_empresa),
    repo.sumMovimientos(id_empresa, periodo.desdeDT, periodo.hastaDT),
    repo.sumMovimientos(id_empresa, prev.desdeDT, prev.hastaDT)
  ]);

  return {
    periodo: {
      desde: periodo.desde,
      hasta: periodo.hasta,
      label: periodo.label
    },
    total_productos: stock.productos_activos,
    productos_publicados: stock.productos_activos,
    stock_bajo: Number(stock.stock_bajo),
    agotados: Number(stock.agotados),
    valor_inventario: Number(stock.valor_venta),
    entradas_hoy: Number(mov.entradas),
    salidas_hoy: Number(mov.salidas),
    movimientos_mes: Number(mov.movimientos),
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

export async function getMovimientosDiarios(id_empresa, query = {}) {
  const periodo = resolvePeriodo(query);
  return repo.movimientosDiarios(id_empresa, periodo.desdeDT, periodo.hastaDT);
}

export async function getStockCategoria(id_empresa) {
  return repo.stockPorCategoria(id_empresa);
}

export async function getTopProductos(id_empresa, query = {}) {
  const periodo = resolvePeriodo(query);
  const limite = Math.min(20, Math.max(1, Number(query.limite || 10)));
  return repo.topProductosSalidas(
    id_empresa,
    periodo.desdeDT,
    periodo.hastaDT,
    limite
  );
}

export async function getAlertasStock(id_empresa) {
  return repo.alertasStock(id_empresa);
}

export async function getUltimosMovimientos(id_empresa, limite = 10) {
  return repo.ultimosMovimientos(id_empresa, limite);
}

export async function getProductosPorCategoria(id_empresa) {
  return repo.stockPorCategoria(id_empresa);
}

export async function getSinMovimiento(id_empresa, query = {}) {
  return repo.sinMovimiento(id_empresa, query.dias);
}

export async function getMovimientosPorTipo(id_empresa, query = {}) {
  const periodo = resolvePeriodo(query);
  return repo.movimientosPorTipo(id_empresa, periodo.desdeDT, periodo.hastaDT);
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
