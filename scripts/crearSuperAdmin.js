/**
 * Crea o actualiza el Super Administrador de la plataforma.
 * Uso: node scripts/crearSuperAdmin.js
 * Requiere SUPER_ADMIN_USER y SUPER_ADMIN_PASSWORD en .env
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const user = process.env.SUPER_ADMIN_USER || process.env.ADMIN_USER;
const password = process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
const nombre = process.env.SUPER_ADMIN_NOMBRE || 'Super Administrador';

if (!user || !password) {
  console.error('Defina SUPER_ADMIN_USER y SUPER_ADMIN_PASSWORD en .env');
  process.exit(1);
}

if (password.length < 10) {
  console.error('SUPER_ADMIN_PASSWORD debe tener al menos 10 caracteres');
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE
});

const [roles] = await conn.query(
  `SELECT id_rol FROM roles WHERE nombre = 'SuperAdministrador' LIMIT 1`
);
if (!roles.length) {
  console.error('Ejecute primero: node scripts/aplicarMultiempresa.js');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const [existing] = await conn.query(
  `SELECT id_usuario FROM usuarios WHERE nombre_usuario = ? LIMIT 1`,
  [user]
);

if (existing.length) {
  await conn.query(
    `
    UPDATE usuarios
    SET password_hash = ?, id_rol = ?, id_empresa = NULL, estado = 1,
        nombre_completo = ?
    WHERE nombre_usuario = ?
  `,
    [hash, roles[0].id_rol, nombre, user]
  );
  console.log(`Super Admin actualizado: ${user}`);
} else {
  await conn.query(
    `
    INSERT INTO usuarios
      (nombre_completo, nombre_usuario, correo, password_hash, id_rol, id_empresa, estado)
    VALUES (?, ?, NULL, ?, ?, NULL, 1)
  `,
    [nombre, user, hash, roles[0].id_rol]
  );
  console.log(`Super Admin creado: ${user}`);
}

await conn.end();
