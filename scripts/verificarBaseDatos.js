import 'dotenv/config';
import pool from '../src/config/database.js';

const expectedTables = [
  'roles',
  'usuarios',
  'categorias',
  'productos',
  'producto_imagenes',
  'movimientos_inventario',
  'configuracion_negocio'
];

try {
  const [tables] = await pool.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0] || {})[0];
  const found = tables.map((row) => row[tableKey]);

  console.log('Tablas encontradas:');
  found.forEach((name) => console.log(` - ${name}`));

  const missing = expectedTables.filter((name) => !found.includes(name));
  if (missing.length) {
    throw new Error(`Faltan tablas: ${missing.join(', ')}`);
  }

  const [engines] = await pool.query(
    `
    SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (?)
    ORDER BY TABLE_NAME
  `,
    [expectedTables]
  );

  console.log('\nMotor y collation:');
  for (const row of engines) {
    console.log(
      ` - ${row.TABLE_NAME}: ${row.ENGINE} / ${row.TABLE_COLLATION}`
    );
  }

  const [fks] = await pool.query(`
    SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);

  console.log('\nLlaves foráneas:');
  for (const row of fks) {
    console.log(
      ` - ${row.TABLE_NAME}.${row.CONSTRAINT_NAME} -> ${row.REFERENCED_TABLE_NAME}`
    );
  }

  const [indexes] = await pool.query(`
    SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('productos', 'producto_imagenes', 'movimientos_inventario')
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
    ORDER BY TABLE_NAME, INDEX_NAME
  `);

  console.log('\nÍndices relevantes:');
  for (const row of indexes) {
    console.log(
      ` - ${row.TABLE_NAME}.${row.INDEX_NAME} (${row.columnas})`
    );
  }

  const [config] = await pool.query(
    'SELECT nombre_negocio, whatsapp, moneda FROM configuracion_negocio WHERE id_configuracion = 1'
  );
  console.log('\nConfiguración del negocio:');
  console.log(config[0] || 'Sin configuración');

  const [roles] = await pool.query('SELECT id_rol, nombre FROM roles');
  console.log('\nRoles:', roles);

  const [categorias] = await pool.query(
    'SELECT id_categoria, nombre, slug FROM categorias ORDER BY orden_visual'
  );
  console.log('\nCategorías seed:', categorias.length);

  const [admins] = await pool.query(
    "SELECT id_usuario, nombre_usuario, LEFT(password_hash, 4) AS hash_prefix FROM usuarios WHERE nombre_usuario = 'admin'"
  );
  console.log('\nAdministrador:', admins[0] || 'Aún no creado');

  console.log('\nVerificación completada.');
} catch (error) {
  console.error('Error de verificación:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
