import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = [
  'MYSQLHOST',
  'MYSQLUSER',
  'MYSQLDATABASE',
  'JWT_SECRET',
  'CORS_ORIGINS'
];

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

const nodeEnv = getEnv('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const frontendUrl = getEnv('FRONTEND_URL', 'http://localhost:5173');

const corsFromEnv = getEnv('CORS_ORIGINS', frontendUrl)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const cookieSameSiteRaw = getEnv(
  'COOKIE_SAME_SITE',
  isProduction ? 'none' : 'lax'
).toLowerCase();

export const env = {
  nodeEnv,
  isProduction,
  port: Number(getEnv('PORT', '3000')),
  mysql: {
    host: getEnv('MYSQLHOST', 'localhost'),
    port: Number(getEnv('MYSQLPORT', '3306')),
    database: getEnv('MYSQLDATABASE'),
    user: getEnv('MYSQLUSER'),
    password: getEnv('MYSQLPASSWORD', '')
  },
  jwt: {
    secret: getEnv('JWT_SECRET', 'dev-secret-change-me-min-32-chars!!'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '30m')
  },
  cloudinary: {
    cloudName: getEnv('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: getEnv('CLOUDINARY_API_KEY', ''),
    apiSecret: getEnv('CLOUDINARY_API_SECRET', '')
  },
  frontendUrl,
  publicAppUrl: getEnv('PUBLIC_APP_URL', frontendUrl),
  apiPublicUrl: getEnv('API_PUBLIC_URL', 'http://localhost:3000'),
  corsOrigins: corsFromEnv,
  cookieSameSite: ['lax', 'strict', 'none'].includes(cookieSameSiteRaw)
    ? cookieSameSiteRaw
    : 'lax',
  maxFileSizeMb: Number(getEnv('MAX_FILE_SIZE_MB', '5')),
  maxProductImages: Number(getEnv('MAX_PRODUCT_IMAGES', '6'))
};

export function assertEnv() {
  if (env.isProduction) {
    const missing = requiredInProduction.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
    }
    if (!env.jwt.secret || env.jwt.secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }
    if (String(env.mysql.user).toLowerCase() === 'root') {
      throw new Error(
        'MYSQLUSER=root está prohibido en producción (Documento 8). Use un usuario de aplicación con privilegios mínimos.'
      );
    }
    if (
      env.corsOrigins.some(
        (o) =>
          o === '*' ||
          o.includes('*') ||
          o.includes('localhost') ||
          o.includes('127.0.0.1')
      )
    ) {
      throw new Error(
        'CORS_ORIGINS de producción no debe incluir localhost, 127.0.0.1 ni *'
      );
    }
    if (!env.corsOrigins.length) {
      throw new Error('CORS_ORIGINS debe incluir al menos un origen en producción');
    }
  } else if (String(env.mysql.user).toLowerCase() === 'root') {
    console.warn(
      '[seguridad] MYSQLUSER=root solo es aceptable en desarrollo. En producción debe usarse un usuario de aplicación.'
    );
  }

  if (!env.mysql.database || !env.mysql.user) {
    throw new Error('MYSQLDATABASE y MYSQLUSER son obligatorias');
  }
}

export default env;
