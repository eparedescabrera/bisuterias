import { body, param, query } from 'express-validator';

export const createCategoriaValidators = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('descripcion')
    .optional({ nullable: true })
    .isLength({ max: 300 })
    .withMessage('La descripción no puede superar 300 caracteres'),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('estado debe ser booleano'),
  body('orden_visual')
    .optional()
    .isInt()
    .withMessage('orden_visual debe ser entero')
];

export const updateCategoriaValidators = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  ...createCategoriaValidators
];

export const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido')
];

export const listCategoriaValidators = [
  query('pagina').optional().isInt({ min: 1 }),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  query('busqueda').optional().isString()
];
