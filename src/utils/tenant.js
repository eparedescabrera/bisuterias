import ApiError from '../utils/ApiError.js';

/** empresa_id siempre desde el token (req.user), nunca desde el body. */
export function getEmpresaId(req) {
  const id = req.user?.id_empresa;
  if (!id) {
    throw new ApiError(403, 'Este usuario no pertenece a una empresa', [], 'FORBIDDEN');
  }
  return Number(id);
}

export function isSuperAdmin(user) {
  return user?.rol === 'SuperAdministrador';
}

export function requireEmpresaContext(req, _res, next) {
  try {
    if (isSuperAdmin(req.user)) {
      throw new ApiError(
        403,
        'El Super Administrador debe usar el panel /api/super-admin',
        [],
        'FORBIDDEN'
      );
    }
    getEmpresaId(req);
    next();
  } catch (e) {
    next(e);
  }
}

export default { getEmpresaId, isSuperAdmin, requireEmpresaContext };
