import * as authService from '../services/auth.service.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(
    req.body.nombre_usuario,
    req.body.password,
    req,
    res
  );
  return success(res, data, 'Inicio de sesión correcto');
});

export const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh(req, res);
  return success(res, data, 'Sesión renovada');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);
  return success(res, null, 'Sesión cerrada');
});

export const perfil = asyncHandler(async (req, res) => {
  const data = await authService.getPerfil(req.user.id_usuario);
  return success(res, data, 'Perfil obtenido');
});

/** Alias Doc 8 */
export const me = perfil;

export const cambiarPassword = asyncHandler(async (req, res) => {
  await authService.cambiarPassword(
    req.user.id_usuario,
    req.body.password_actual,
    req.body.password_nueva,
    req,
    res
  );
  return success(res, null, 'Contraseña actualizada');
});

export const revokeAll = asyncHandler(async (req, res) => {
  await authService.revokeAllSessions(req.user.id_usuario, req, res);
  return success(res, null, 'Todas las sesiones fueron cerradas');
});
