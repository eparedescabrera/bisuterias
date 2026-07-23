/**
 * Repara invpro_app para conexiones desde Railway (red privada 100.64.x.x).
 * Usa root vía proxy público del .env (backup) o MYSQL* actuales si aún es root.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envText = fs.readFileSync(envPath, 'utf8');

function readEnvLine(key) {
  const m = envText.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

const rootUser =
  readEnvLine('MYSQLUSER_ROOT_BACKUP').replace(/^#\s*/, '') || 'root';
// Backup comentado en .env: buscar línea comentada
const rootPassCommented = envText.match(
  /#\s*MYSQLPASSWORD_ROOT_BACKUP=(.+)/
)?.[1]?.trim();
const rootPassword =
  rootPassCommented ||
  (readEnvLine('MYSQLUSER') === 'root' ? readEnvLine('MYSQLPASSWORD') : '');

if (!rootPassword) {
  console.error(
    'No hay password de root. Añade en .env:\nMYSQLPASSWORD_ROOT_BACKUP=tu_password_root'
  );
  process.exit(1);
}

const APP_USER = 'invpro_app';
// Contraseña solo alfanumérica: evita problemas al pegar en Railway Variables
const appPassword = crypto.randomBytes(18).toString('base64url');

const host = readEnvLine('MYSQLHOST') || process.env.MYSQLHOST;
const port = Number(readEnvLine('MYSQLPORT') || process.env.MYSQLPORT || 3306);
const database = readEnvLine('MYSQLDATABASE') || process.env.MYSQLDATABASE;

const root = await mysql.createConnection({
  host,
  port,
  user: 'root',
  password: rootPassword,
  database,
  multipleStatements: true
});

try {
  const u = root.escape(APP_USER);
  const p = root.escape(appPassword);
  const db = `\`${database.replace(/`/g, '')}\``;

  // Recrear para % (cualquier host, incluye 100.64.x.x de Railway)
  await root.query(`DROP USER IF EXISTS ${u}@'%'`);
  await root.query(`CREATE USER ${u}@'%' IDENTIFIED BY ${p}`);
  await root.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.* TO ${u}@'%'`
  );
  await root.query('FLUSH PRIVILEGES');

  const [grants] = await root.query(`SHOW GRANTS FOR ${u}@'%'`);
  console.log('Grants:', grants);
} finally {
  await root.end();
}

const app = await mysql.createConnection({
  host,
  port,
  user: APP_USER,
  password: appPassword,
  database
});

try {
  const [rows] = await app.query('SELECT 1 AS ok, CURRENT_USER() AS quien');
  console.log('Login OK:', rows[0]);
} finally {
  await app.end();
}

let next = envText;
next = next.replace(/^MYSQLUSER=.*$/m, `MYSQLUSER=${APP_USER}`);
next = next.replace(/^MYSQLPASSWORD=.*$/m, `MYSQLPASSWORD=${appPassword}`);
if (!next.includes('MYSQLPASSWORD_ROOT_BACKUP=')) {
  next += `\n# MYSQLPASSWORD_ROOT_BACKUP=${rootPassword}\n`;
}
fs.writeFileSync(envPath, next, 'utf8');

console.log('\nListo. Actualiza en Railway Variables del BACKEND:');
console.log(`MYSQLUSER=${APP_USER}`);
console.log(`MYSQLPASSWORD=${appPassword}`);
console.log('(Copia exactamente, sin espacios ni comillas)');
console.log('Luego Redeploy del backend.');
