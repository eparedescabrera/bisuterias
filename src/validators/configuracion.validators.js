import { body } from 'express-validator';

export const updateConfiguracionValidators = [
  body('nombre_negocio')
    .trim()
    .isLength({ min: 1, max: 160 })
    .withMessage('nombre_negocio obligatorio'),
  body('descripcion').optional({ nullable: true }).isLength({ max: 600 }),
  body('telefono').optional({ nullable: true }).isLength({ max: 30 }),
  body('whatsapp')
    .optional({ nullable: true })
    .matches(/^\d+$/)
    .withMessage('whatsapp solo dígitos con código de país')
    .isLength({ max: 30 }),
  body('correo').optional({ nullable: true }).isLength({ max: 150 }),
  body('direccion').optional({ nullable: true }).isLength({ max: 350 }),
  body('mapa_url')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 600 })
    .withMessage('mapa_url máximo 600 caracteres'),
  body('facebook').optional({ nullable: true }).isLength({ max: 300 }),
  body('instagram').optional({ nullable: true }).isLength({ max: 300 }),
  body('moneda').optional().isLength({ min: 3, max: 3 }),
  body('mostrar_stock_publico').optional().isBoolean(),
  body('mensaje_bienvenida').optional({ nullable: true }).isLength({ max: 600 }),
  body('mensaje_inferior').optional({ nullable: true }).isLength({ max: 350 })
];
