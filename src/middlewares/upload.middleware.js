import multer from 'multer';
import path from 'path';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_IMAGE_EXT
} from '../config/security.js';

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();

  if (ext === '.svg' || mime === 'image/svg+xml') {
    cb(new ApiError(415, 'SVG no permitido por seguridad', [], 'UNSUPPORTED_MEDIA'));
    return;
  }

  if (
    mime.includes('heic') ||
    mime.includes('heif') ||
    ext === '.heic' ||
    ext === '.heif'
  ) {
    cb(
      new ApiError(
        400,
        'El formato HEIC/HEIF (iPhone) no está permitido. Guarde o exporte la imagen como JPG o PNG e intente de nuevo.',
        [],
        'VALIDATION_ERROR'
      )
    );
    return;
  }

  const mimeOk = ALLOWED_IMAGE_MIME.has(mime);
  const extOk = !ext || ALLOWED_IMAGE_EXT.has(ext);

  // Algunos móviles envían MIME vacío o genérico; aceptar si la extensión es válida
  if (!mimeOk && !(mime === 'application/octet-stream' && extOk && ext)) {
    cb(
      new ApiError(
        400,
        'Formato de imagen no permitido. Use JPEG, PNG o WEBP.',
        [],
        'VALIDATION_ERROR'
      )
    );
    return;
  }

  if (ext && !ALLOWED_IMAGE_EXT.has(ext) && mimeOk) {
    // MIME válido pero extensión rara: permitir (p. ej. .jpe)
  } else if (ext && !ALLOWED_IMAGE_EXT.has(ext) && !mimeOk) {
    cb(
      new ApiError(
        400,
        'Extensión de imagen no permitida. Use .jpg, .jpeg, .png o .webp',
        [],
        'VALIDATION_ERROR'
      )
    );
    return;
  }

  cb(null, true);
}

const limits = {
  fileSize: env.maxFileSizeMb * 1024 * 1024
};

export const uploadProductImages = multer({
  storage,
  fileFilter,
  limits
}).array('imagenes', env.maxProductImages);

export const uploadSingleImage = (fieldName) =>
  multer({
    storage,
    fileFilter,
    limits
  }).single(fieldName);

export default {
  uploadProductImages,
  uploadSingleImage
};
