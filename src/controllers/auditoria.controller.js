import * as auditoriaRepo from '../repositories/auditoria.repository.js';
import { success } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

export const listar = asyncHandler(async (req, res) => {
  const result = await auditoriaRepo.listar(req.query);
  return success(res, result.data, 'Auditoría listada', 200, result.meta);
});
