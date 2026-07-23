import { body, param, query } from 'express-validator';

const unidades = ['Unidad', 'Paquete', 'Caja', 'Par', 'Docena'];
const publicaciones = ['Publicado', 'Oculto'];
const disponibilidades = ['Disponible', 'Agotado', 'Proximamente', 'Descontinuado'];

export const createProductoValidators = [
  body('codigo')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('codigo obligatorio, máximo 50 caracteres'),
  body('nombre')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('nombre obligatorio, máximo 150 caracteres'),
  body('id_categoria')
    .isInt({ min: 1 })
    .withMessage('id_categoria inválido'),
  body('precio_venta')
    .isFloat({ min: 0 })
    .withMessage('precio_venta debe ser numérico >= 0'),
  body('precio_anterior')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('precio_anterior no negativo'),
  body('stock_inicial')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_inicial entero >= 0'),
  body('stock_minimo')
    .optional()
    .isInt({ min: 0 })
    .withMessage('stock_minimo entero >= 0'),
  body('unidad_medida')
    .optional()
    .isIn(unidades)
    .withMessage(`unidad_medida debe ser: ${unidades.join(', ')}`),
  body('estado_publicacion')
    .optional()
    .isIn(publicaciones)
    .withMessage('estado_publicacion inválido'),
  body('destacado')
    .optional()
    .isBoolean()
    .withMessage('destacado debe ser booleano')
];

export const updateProductoValidators = [
  param('id').isInt({ min: 1 }),
  body('codigo').optional().trim().isLength({ min: 1, max: 50 }),
  body('nombre').optional().trim().isLength({ min: 1, max: 150 }),
  body('id_categoria').optional().isInt({ min: 1 }),
  body('precio_venta').optional().isFloat({ min: 0 }),
  body('precio_anterior').optional({ nullable: true }).isFloat({ min: 0 }),
  body('stock_minimo').optional().isInt({ min: 0 }),
  body('unidad_medida').optional().isIn(unidades),
  body('estado_publicacion').optional().isIn(publicaciones),
  body('estado_disponibilidad').optional().isIn(disponibilidades),
  body('destacado').optional().isBoolean()
];

export const listProductoValidators = [
  query('pagina').optional().isInt({ min: 1 }),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  query('publicacion').optional().isIn(publicaciones),
  query('disponibilidad').optional().isIn(disponibilidades)
];

export const patchPublicacionValidators = [
  param('id').isInt({ min: 1 }),
  body('estado_publicacion').isIn(publicaciones)
];

export const patchDestacadoValidators = [
  param('id').isInt({ min: 1 }),
  body('destacado').isBoolean()
];

export const patchDisponibilidadValidators = [
  param('id').isInt({ min: 1 }),
  body('estado_disponibilidad').isIn(disponibilidades)
];
