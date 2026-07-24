import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

function mapErrorCode(statusCode, err) {
  if (err.errorCode) return err.errorCode;
  if (statusCode === 400) return 'VALIDATION_ERROR';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 429) return 'RATE_LIMITED';
  if (statusCode === 413) return 'PAYLOAD_TOO_LARGE';
  if (statusCode === 415) return 'UNSUPPORTED_MEDIA';
  return 'INTERNAL_ERROR';
}

export function errorMiddleware(err, req, res, _next) {
  const requestId = req.requestId || res.getHeader('X-Request-Id');

  // CORS origin rejected
  if (err?.message === 'Origen no permitido') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido',
      errorCode: 'FORBIDDEN',
      requestId,
      errors: []
    });
  }

  if (err instanceof ApiError || err?.isOperational) {
    const status = err.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: err.message,
      errorCode: mapErrorCode(status, err),
      requestId,
      errors: err.errors || []
    });
  }

  // Body JSON demasiado grande (p. ej. imagen base64)
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({
      success: false,
      message:
        'El archivo es demasiado grande. Use una imagen más liviana (recomendado < 1 MB).',
      errorCode: 'PAYLOAD_TOO_LARGE',
      requestId,
      errors: []
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `El archivo supera el máximo de ${env.maxFileSizeMb} MB`,
        errorCode: 'PAYLOAD_TOO_LARGE',
        requestId,
        errors: []
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `Máximo ${env.maxProductImages} imágenes por producto`,
        errorCode: 'VALIDATION_ERROR',
        requestId,
        errors: []
      });
    }
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Recurso duplicado',
      errorCode: 'CONFLICT',
      requestId,
      errors: []
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Relación inválida',
      errorCode: 'VALIDATION_ERROR',
      requestId,
      errors: []
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'El recurso tiene relaciones; use borrado lógico',
      errorCode: 'CONFLICT',
      requestId,
      errors: []
    });
  }

  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    return res.status(503).json({
      success: false,
      message: 'Servicio de base de datos no disponible',
      errorCode: 'INTERNAL_ERROR',
      requestId,
      errors: []
    });
  }

  if (env.nodeEnv !== 'production') {
    // Nunca volcar req.body: puede contener contraseñas
    console.error(`[${requestId}]`, err?.message || err);
  } else {
    console.error(`[${requestId}]`, err.message);
  }

  return res.status(500).json({
    success: false,
    message: 'No fue posible procesar la solicitud',
    errorCode: 'INTERNAL_ERROR',
    requestId,
    errors: []
  });
}

export default errorMiddleware;
