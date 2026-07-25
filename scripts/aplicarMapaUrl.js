/**
 * Agrega configuracion_negocio.mapa_url (idempotente).
 * Uso: npm run db:mapa
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    LIMIT 1
  `,
    [table, column]
  );
  return rows.length > 0;
}

async function run() {
  const user =
    process.env.MYSQL_MIGRATE_USER ||
    process.env.MYSQLUSER_ROOT_BACKUP ||
    process.env.MYSQLUSER;
  const password =
    process.env.MYSQL_MIGRATE_PASSWORD ||
    process.env.MYSQLPASSWORD_ROOT_BACKUP ||
    process.env.MYSQLPASSWORD ||
    '';

  const conn = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user,
    password,
    database: process.env.MYSQLDATABASE
  });

  if (!(await columnExists(conn, 'configuracion_negocio', 'mapa_url'))) {
    await conn.query(
      `
      ALTER TABLE configuracion_negocio
      ADD COLUMN mapa_url VARCHAR(600) NULL AFTER direccion
    `
    );
    console.log('Columna mapa_url creada');
  } else {
    console.log('Columna mapa_url ya existe');
  }

  const [r] = await conn.query(
    `
    UPDATE configuracion_negocio c
    INNER JOIN empresas e ON e.id_empresa = c.id_empresa
    SET c.mapa_url = ?
    WHERE e.slug = 'accesorios-anny'
      AND (c.mapa_url IS NULL OR c.mapa_url = '')
  `,
    ['https://maps.app.goo.gl/HAsjz82zZhCPQyNi8']
  );
  console.log('Seed Accesorios Anny:', r.affectedRows, 'fila(s)');

  await conn.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
