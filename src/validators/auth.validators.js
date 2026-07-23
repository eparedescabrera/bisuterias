import { body } from 'express-validator';

export const loginValidators = [
  body('nombre_usuario')
    .trim()
    .notEmpty()
    .withMessage('El usuario es obligatorio')
    .isLength({ max: 80 })
    .withMessage('Usuario demasiado largo'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

export const changePasswordValidators = [
  body('password_actual')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria'),
  body('password_nueva')
    .isLength({ min: 10 })
    .withMessage('La nueva contraseña debe tener al menos 10 caracteres')
    .matches(/[A-Za-z]/)
    .withMessage('La nueva contraseña debe incluir letras')
    .matches(/[0-9]/)
    .withMessage('La nueva contraseña debe incluir números')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('La nueva contraseña debe incluir un carácter especial')
];
