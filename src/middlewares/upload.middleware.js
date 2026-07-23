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

  if (ext === '.svg' || file.mimetype === 'image/svg+xml') {
    cb(new ApiError(415, 'SVG no permitido por seguridad', [], 'UNSUPPORTED_MEDIA'));
    return;
  }

  if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    cb(
      new ApiError(
        400,
        'Formato de imagen no permitido. Use JPEG, PNG o WEBP',
        [],
        'VALIDATION_ERROR'
      )
    );
    return;
  }

  if (ext && !ALLOWED_IMAGE_EXT.has(ext)) {
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
