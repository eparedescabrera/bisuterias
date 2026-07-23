import { body, query } from 'express-validator';
import {
  MOTIVOS_INVENTARIO,
  TIPOS_MOVIMIENTO
} from '../utils/inventario.constants.js';

const tiposCreate = TIPOS_MOVIMIENTO.filter((t) => t !== 'Stock inicial');

export const createMovimientoValidators = [
  body('id_producto').isInt({ min: 1 }).withMessage('id_producto inválido'),
  body('tipo_movimiento')
    .isIn(tiposCreate)
    .withMessage(`tipo_movimiento debe ser: ${tiposCreate.join(', ')}`),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser entero mayor que cero'),
  body('motivo')
    .trim()
    .isIn(MOTIVOS_INVENTARIO)
    .withMessage(`motivo debe ser: ${MOTIVOS_INVENTARIO.join(', ')}`),
  body('referencia')
    .optional({ nullable: true })
    .isLength({ max: 120 })
    .withMessage('referencia máximo 120 caracteres')
];

export const listMovimientoValidators = [
  query('pagina').optional().isInt({ min: 1 }),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  query('id_producto').optional().isInt({ min: 1 }),
  query('id_usuario').optional().isInt({ min: 1 }),
  query('tipo_movimiento').optional().isIn(TIPOS_MOVIMIENTO),
  query('periodo').optional().isIn(['hoy', 'semana', 'mes']),
  query('fecha_desde')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('fecha_desde inválida (YYYY-MM-DD)'),
  query('fecha_hasta')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('fecha_hasta inválida (YYYY-MM-DD)'),
  query('busqueda').optional().isString()
];
