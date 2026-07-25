/**
 * Prueba credenciales Cloudinary (sin guardar archivos permanentes).
 * Uso: node scripts/testCloudinary.js
 */
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('cloud_name:', cloudName || '(vacío)');
console.log('api_key presente:', Boolean(apiKey), apiKey ? `(len=${apiKey.length})` : '');
console.log('api_secret presente:', Boolean(apiSecret), apiSecret ? `(len=${apiSecret.length})` : '');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Faltan variables CLOUDINARY_* en .env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

try {
  const ping = await cloudinary.api.ping();
  console.log('ping OK:', ping);

  // Subida mínima 1x1 PNG en memoria
  const tinyPng =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const result = await cloudinary.uploader.upload(
    `data:image/png;base64,${tinyPng}`,
    { folder: 'inventory-pro/_healthcheck', overwrite: true }
  );
  console.log('upload OK:', result.secure_url);

  if (result.public_id) {
    await cloudinary.uploader.destroy(result.public_id);
    console.log('cleanup OK');
  }
} catch (e) {
  console.error('FALLÓ:', e?.http_code || e?.statusCode || '', e?.message || e);
  if (e?.error) console.error('detalle:', e.error);
  process.exit(1);
}
