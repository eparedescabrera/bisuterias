import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const required = ['MYSQLHOST', 'MYSQLUSER', 'MYSQLDATABASE'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno ${key}`);
    process.exit(1);
  }
}

const baseConfig = {
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4'
};

const databaseName = process.env.MYSQLDATABASE;

async function ensureDatabase() {
  const bootstrap = await mysql.createConnection(baseConfig);
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Base de datos lista: ${databaseName}`);
  } finally {
    await bootstrap.end();
  }
}

async function runSqlFile(connection, relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const sql = fs.readFileSync(fullPath, 'utf8');
  console.log(`Ejecutando ${relativePath}...`);
  await connection.query(sql);
  console.log(`OK: ${relativePath}`);
}

try {
  await ensureDatabase();

  const connection = await mysql.createConnection({
    ...baseConfig,
    database: databaseName
  });

  try {
    await runSqlFile(connection, 'sql/database.sql');
    await runSqlFile(connection, 'sql/seeds.sql');
    console.log('Base de datos inicializada correctamente.');
  } finally {
    await connection.end();
  }
} catch (error) {
  console.error('Error al ejecutar SQL:', error.message);
  if (error.code) console.error('Código:', error.code);
  process.exitCode = 1;
}
