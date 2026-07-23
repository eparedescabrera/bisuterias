import { query } from 'express-validator';

const REPORTES = [
  'inventario',
  'kardex',
  'valoracion',
  'rotacion',
  'ajustes'
];
const FORMATOS = ['xlsx', 'pdf', 'excel'];
const TIPOS = [
  'ENTRADA',
  'SALIDA',
  'AJUSTE',
  'Entrada',
  'Salida',
  'Ajuste positivo',
  'Ajuste negativo',
  'Devolucion',
  'Correccion',
  'Stock inicial'
];
const STOCK = ['todos', 'agotado', 'bajo', 'normal'];

export const filtrosReporte = [
  query('desde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('desde debe ser YYYY-MM-DD'),
  query('hasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('hasta debe ser YYYY-MM-DD'),
  query('periodo')
    .optional()
    .isIn(['hoy', '7dias', 'semana', 'mes', 'mes_anterior', 'anio', 'año'])
    .withMessage('Período no válido'),
  query('pagina').optional().isInt({ min: 1 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limite').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('id_producto').optional().isInt({ min: 1 }).toInt(),
  query('productoId').optional().isInt({ min: 1 }).toInt(),
  query('id_categoria').optional().isInt({ min: 1 }).toInt(),
  query('categoriaId').optional().isInt({ min: 1 }).toInt(),
  query('id_usuario').optional().isInt({ min: 1 }).toInt(),
  query('usuarioId').optional().isInt({ min: 1 }).toInt(),
  query('tipo').optional().isIn(TIPOS),
  query('tipo_movimiento').optional().isIn(TIPOS),
  query('stock').optional().isIn(STOCK),
  query('dias').optional().isInt({ min: 7, max: 365 }).toInt()
];

export const exportarValidator = [
  ...filtrosReporte,
  query('reporte')
    .optional()
    .isIn(REPORTES)
    .withMessage('Reporte no soportado'),
  query('formato')
    .optional()
    .isIn(FORMATOS)
    .withMessage('Formato debe ser xlsx o pdf')
];
