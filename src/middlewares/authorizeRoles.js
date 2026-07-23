import ApiError from '../utils/ApiError.js';

export function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'No autenticado', [], 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.rol)) {
      return next(
        new ApiError(403, 'No tiene permisos para esta acción', [], 'FORBIDDEN')
      );
    }

    return next();
  };
}

export const requireAdmin = authorizeRoles('Administrador');
export const requireRoles = authorizeRoles;

export default authorizeRoles;
