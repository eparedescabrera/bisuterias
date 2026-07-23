import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '..', 'sql', 'security_doc8.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const conn = await mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE,
  multipleStatements: true
});

try {
  await conn.query(sql);
  const [tables] = await conn.query(
    `SHOW TABLES WHERE Tables_in_${process.env.MYSQLDATABASE} IN ('sesiones','auditoria_sistema')`
  );
  console.log('OK security_doc8.sql');
  console.log('Tablas:', tables);
} finally {
  await conn.end();
}
