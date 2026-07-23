import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';
import ApiError from '../utils/ApiError.js';

let configured = false;

export function configureCloudinary() {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });

  configured = true;
  return true;
}

export function assertCloudinaryReady() {
  if (!configured && !configureCloudinary()) {
    throw new ApiError(500, 'Cloudinary no está configurado');
  }
}

export function uploadBufferToCloudinary(buffer, folder, publicId = undefined) {
  assertCloudinaryReady();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true
      },
      (error, result) => {
        if (error) {
          reject(
            new ApiError(
              502,
              `No se pudo subir la imagen a Cloudinary: ${error.message || 'error desconocido'}`,
              [],
              'INTERNAL_ERROR'
            )
          );
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

export async function destroyCloudinaryAsset(publicId) {
  if (!publicId) return;
  assertCloudinaryReady();
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
