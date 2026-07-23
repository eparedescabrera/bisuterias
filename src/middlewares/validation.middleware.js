import { validationResult } from 'express-validator';
import { fail } from '../utils/response.js';

export function validationMiddleware(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array().map((item) => ({
    field: item.path,
    message: item.msg
  }));

  return fail(res, 'Datos inválidos', 400, errors);
}

export default validationMiddleware;
