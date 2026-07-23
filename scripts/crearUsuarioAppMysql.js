/**
 * Crea el usuario MySQL de aplicación (Documento 8) y actualiza backend/.env.
 * Se conecta como root (valores actuales de .env), crea invpro_app y prueba el login.
 *
 * Uso: node scripts/crearUsuarioAppMysql.js
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');

const APP_USER = process.env.APP_MYSQL_USER || 'invpro_app';
const DB_NAME = process.env.MYSQLDATABASE;

if (!DB_NAME || !process.env.MYSQLHOST || !process.env.MYSQLUSER) {
  console.error('Faltan MYSQLHOST / MYSQLUSER / MYSQLDATABASE en .env');
  process.exit(1);
}

if (String(process.env.MYSQLUSER).toLowerCase() !== 'root') {
  console.log(
    `Ya no estás usando root (MYSQLUSER=${process.env.MYSQLUSER}). No se creó nada.`
  );
  process.exit(0);
}

const appPassword =
  process.env.APP_MYSQL_PASSWORD ||
  crypto.randomBytes(24).toString('base64url');

const rootConfig = {
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD || '',
  database: DB_NAME,
  multipleStatements: true
};

const root = await mysql.createConnection(rootConfig);

try {
  // Escapar identificadores/password de forma segura para DDL
  const userLiteral = root.escape(APP_USER);
  const hostLiteral = root.escape('%');
  const passLiteral = root.escape(appPassword);
  const dbIdent = `\`${DB_NAME.replace(/`/g, '')}\``;

  await root.query(
    `CREATE USER IF NOT EXISTS ${userLiteral}@${hostLiteral} IDENTIFIED BY ${passLiteral}`
  );
  // Si el usuario ya existía, actualiza la contraseña
  await root.query(
    `ALTER USER ${userLiteral}@${hostLiteral} IDENTIFIED BY ${passLiteral}`
  );
  await root.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbIdent}.* TO ${userLiteral}@${hostLiteral}`
  );
  await root.query('FLUSH PRIVILEGES');

  console.log(`Usuario creado/actualizado: ${APP_USER}@%`);
  console.log(`Privilegios: SELECT, INSERT, UPDATE, DELETE sobre ${DB_NAME}.*`);
} finally {
  await root.end();
}

// Probar conexión con el nuevo usuario
const app = await mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: APP_USER,
  password: appPassword,
  database: DB_NAME
});

try {
  const [rows] = await app.query('SELECT COUNT(*) AS n FROM productos');
  console.log(`Prueba OK: productos visibles = ${rows[0].n}`);
} finally {
  await app.end();
}

// Actualizar .env local
let envText = fs.readFileSync(envPath, 'utf8');
if (!/^MYSQLUSER=/m.test(envText)) {
  console.error('.env no tiene MYSQLUSER');
  process.exit(1);
}

envText = envText.replace(/^MYSQLUSER=.*$/m, `MYSQLUSER=${APP_USER}`);
envText = envText.replace(
  /^MYSQLPASSWORD=.*$/m,
  `MYSQLPASSWORD=${appPassword}`
);

// Guardar root anterior comentado para emergencias (solo local, gitignored)
if (!envText.includes('MYSQLUSER_ROOT_BACKUP')) {
  envText +=
    `\n# Backup local (no subir a git). Root Railway:\n` +
    `# MYSQLUSER_ROOT_BACKUP=root\n` +
    `# MYSQLPASSWORD_ROOT_BACKUP=${process.env.MYSQLPASSWORD || ''}\n`;
}

fs.writeFileSync(envPath, envText, 'utf8');
console.log('backend/.env actualizado con MYSQLUSER=invpro_app');
console.log(
  'Guarda la misma contraseña en Railway Variables cuando despliegues el backend.'
);
console.log('Reinicia npm run dev para aplicar el cambio.');
