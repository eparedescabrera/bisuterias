import * as repo from '../repositories/reportes.repository.js';
import { resolvePeriodo } from '../utils/datePeriod.js';
import { buildExcelBuffer } from '../utils/exportExcel.js';
import { buildPdfBuffer } from '../utils/exportPdf.js';
import ApiError from '../utils/ApiError.js';

function withPeriod(query) {
  const periodo = resolvePeriodo(query);
  return { ...query, ...periodo };
}

export async function inventario(query) {
  return repo.inventarioActual(query);
}

export async function kardex(query) {
  return repo.kardex(withPeriod(query));
}

export async function rotacion(query) {
  const periodo = resolvePeriodo(query);
  return repo.rotacion({ ...query, ...periodo });
}

export async function valoracion() {
  return repo.valoracion();
}

export async function ajustes(query) {
  return repo.ajustes(withPeriod(query));
}

export async function porCategoria() {
  return repo.inventarioPorCategoria();
}

export async function exportar(query, usuario) {
  const reporte = query.reporte || 'inventario';
  let formato = (query.formato || 'xlsx').toLowerCase();
  if (formato === 'excel') formato = 'xlsx';
  const negocio = await repo.getNegocio();
  const periodo = resolvePeriodo(query);

  let title = 'Reporte';
  let rows = [];
  let columns = [];

  if (reporte === 'inventario') {
    title = 'Inventario actual';
    const result = await repo.inventarioActual({ ...query, pagina: 1, limite: 100 });
    columns = [
      { key: 'codigo', header: 'Código' },
      { key: 'nombre', header: 'Producto' },
      { key: 'categoria', header: 'Categoría' },
      { key: 'stock_actual', header: 'Stock' },
      { key: 'stock_minimo', header: 'Mínimo' },
      { key: 'precio_venta', header: 'Precio' },
      { key: 'valor_venta', header: 'Valor venta' },
      { key: 'valor_costo', header: 'Valor costo' }
    ];
    rows = result.data.map((r) => ({
      ...r,
      valor_costo: 'No disponible'
    }));
  } else if (reporte === 'kardex') {
    title = 'Kardex';
    const result = await repo.kardex({ ...withPeriod(query), pagina: 1, limite: 100 });
    columns = [
      { key: 'fecha_movimiento', header: 'Fecha' },
      { key: 'codigo', header: 'Código' },
      { key: 'producto', header: 'Producto' },
      { key: 'tipo_movimiento', header: 'Tipo' },
      { key: 'cantidad', header: 'Cantidad' },
      { key: 'stock_anterior', header: 'Stock ant.' },
      { key: 'stock_nuevo', header: 'Stock nuevo' },
      { key: 'motivo', header: 'Motivo' },
      { key: 'nombre_usuario', header: 'Usuario' }
    ];
    rows = result.data;
  } else if (reporte === 'valoracion') {
    title = 'Valoración de inventario';
    const data = await repo.valoracion();
    columns = [
      { key: 'concepto', header: 'Concepto' },
      { key: 'valor', header: 'Valor' }
    ];
    rows = [
      { concepto: 'Valor a venta', valor: data.valor_venta },
      { concepto: 'Valor a costo', valor: data.valor_costo_mensaje },
      { concepto: 'Utilidad potencial', valor: 'No disponible' },
      { concepto: 'Productos activos', valor: data.productos_activos },
      { concepto: 'Unidades', valor: data.unidades }
    ];
  } else if (reporte === 'rotacion') {
    title = 'Rotación de productos';
    const data = await repo.rotacion({ ...withPeriod(query) });
    columns = [
      { key: 'tipo', header: 'Tipo' },
      { key: 'codigo', header: 'Código' },
      { key: 'nombre', header: 'Producto' },
      { key: 'metric', header: 'Métrica' }
    ];
    rows = [
      ...data.alta_rotacion.map((r) => ({
        tipo: 'Alta',
        codigo: r.codigo,
        nombre: r.nombre,
        metric: r.unidades_salida
      })),
      ...data.baja_rotacion.map((r) => ({
        tipo: 'Baja',
        codigo: r.codigo,
        nombre: r.nombre,
        metric: r.dias_sin_salida
      }))
    ];
  } else if (reporte === 'ajustes') {
    title = 'Ajustes y diferencias';
    const result = await repo.ajustes({
      ...withPeriod(query),
      pagina: 1,
      limite: 100
    });
    columns = [
      { key: 'fecha_movimiento', header: 'Fecha' },
      { key: 'codigo', header: 'Código' },
      { key: 'producto', header: 'Producto' },
      { key: 'tipo_movimiento', header: 'Tipo' },
      { key: 'cantidad', header: 'Cantidad' },
      { key: 'stock_anterior', header: 'Stock ant.' },
      { key: 'stock_nuevo', header: 'Stock nuevo' },
      { key: 'motivo', header: 'Motivo' },
      { key: 'nombre_usuario', header: 'Usuario' }
    ];
    rows = result.data;
  } else {
    throw new ApiError(400, 'Reporte no soportado');
  }

  const meta = {
    negocio: negocio.nombre_negocio,
    titulo: title,
    filtros: {
      desde: periodo.desde,
      hasta: periodo.hasta,
      reporte,
      formato
    },
    generado: new Date().toISOString(),
    usuario: usuario?.nombre_usuario || 'admin'
  };

  const safeName = `reporte_${reporte}_${periodo.hasta}`;

  if (formato === 'pdf') {
    const buffer = await buildPdfBuffer({ meta, columns, rows });
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `${safeName}.pdf`
    };
  }

  const buffer = await buildExcelBuffer({ meta, columns, rows });
  return {
    buffer,
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${safeName}.xlsx`
  };
}

export default {
  inventario,
  kardex,
  rotacion,
  valoracion,
  ajustes,
  porCategoria,
  exportar
};
