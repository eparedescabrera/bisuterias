import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';

const nombreCompleto =
  process.env.ADMIN_NOMBRE || process.argv[2] || 'Administrador';
const nombreUsuario = process.env.ADMIN_USER || process.argv[3] || 'admin';
const password = process.env.ADMIN_PASSWORD || process.argv[4];

if (!password) {
  console.error('Falta ADMIN_PASSWORD (env) o el 4.º argumento');
  process.exit(1);
}

if (password.length < 10) {
  console.error('ADMIN_PASSWORD debe tener al menos 10 caracteres (Documento 8)');
  process.exit(1);
}

if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error(
    'ADMIN_PASSWORD debe combinar letras, números y al menos un carácter especial'
  );
  process.exit(1);
}

try {
  const [roles] = await pool.query(
    'SELECT id_rol FROM roles WHERE nombre = ? LIMIT 1',
    ['Administrador']
  );

  if (!roles.length) {
    throw new Error('No existe el rol Administrador. Ejecute seeds.sql primero.');
  }

  const [existing] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE nombre_usuario = ? LIMIT 1',
    [nombreUsuario]
  );

  const hash = await bcrypt.hash(password, 12);

  if (existing.length) {
    await pool.query(
      `
      UPDATE usuarios
      SET password_hash = ?, id_rol = ?, estado = 1, nombre_completo = ?
      WHERE nombre_usuario = ?
    `,
      [hash, roles[0].id_rol, nombreCompleto, nombreUsuario]
    );
    console.log(`Administrador actualizado: ${nombreUsuario}`);
  } else {
    await pool.query(
      `
      INSERT INTO usuarios
        (nombre_completo, nombre_usuario, correo, password_hash, id_rol, estado)
      VALUES (?, ?, NULL, ?, ?, 1)
    `,
      [nombreCompleto, nombreUsuario, hash, roles[0].id_rol]
    );
    console.log(`Administrador creado: ${nombreUsuario}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
