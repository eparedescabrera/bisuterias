/**
 * Aplica multiempresa sobre una BD existente (Railway/local).
 * Idempotente: puede re-ejecutarse.
 *
 * Uso: node scripts/aplicarMultiempresa.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    LIMIT 1
  `,
    [table, indexName]
  );
  return rows.length > 0;
}

async function constraintExists(conn, table, name) {
  const [rows] = await conn.query(
    `
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
    LIMIT 1
  `,
    [table, name]
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

  console.log(`Conectando como ${user}…`);
  const conn = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user,
    password,
    database: process.env.MYSQLDATABASE,
    multipleStatements: true
  });

  const sqlPath = path.join(__dirname, '../sql/multiempresa.sql');
  await conn.query(fs.readFileSync(sqlPath, 'utf8'));
  console.log('OK tablas empresas/suscripciones/comprobantes');

  // Empresa seed (Accesorios Anny) — Activa
  const [empresas] = await conn.query(
    `SELECT id_empresa FROM empresas WHERE slug = 'accesorios-anny' LIMIT 1`
  );
  let idEmpresa;
  if (!empresas.length) {
    const [ins] = await conn.query(
      `
      INSERT INTO empresas
        (nombre_negocio, slug, propietario, telefono, correo, plan, estado, fecha_vencimiento)
      VALUES
        ('Accesorios Anny', 'accesorios-anny', 'Anny', '85548880',
         'anny@accesorios.local', 'Mensual', 'Activa', DATE_ADD(CURDATE(), INTERVAL 365 DAY))
    `
    );
    idEmpresa = ins.insertId;
    console.log('Empresa seed creada id=', idEmpresa);
  } else {
    idEmpresa = empresas[0].id_empresa;
    console.log('Empresa seed existente id=', idEmpresa);
  }

  // usuarios.id_empresa (NULL = Super Admin)
  if (!(await columnExists(conn, 'usuarios', 'id_empresa'))) {
    await conn.query(
      `ALTER TABLE usuarios ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_rol`
    );
    await conn.query(
      `
      ALTER TABLE usuarios
      ADD CONSTRAINT fk_usuarios_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
    `
    );
    console.log('OK usuarios.id_empresa');
  }
  await conn.query(
    `UPDATE usuarios SET id_empresa = ? WHERE id_empresa IS NULL AND id_rol <> (
      SELECT id_rol FROM roles WHERE nombre = 'SuperAdministrador' LIMIT 1
    )`,
    [idEmpresa]
  );

  // categorias
  if (!(await columnExists(conn, 'categorias', 'id_empresa'))) {
    await conn.query(
      `ALTER TABLE categorias ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_categoria`
    );
    await conn.query(`UPDATE categorias SET id_empresa = ? WHERE id_empresa IS NULL`, [
      idEmpresa
    ]);
    await conn.query(
      `ALTER TABLE categorias MODIFY id_empresa INT UNSIGNED NOT NULL`
    );
    // Quitar uniques globales si existen
    for (const uq of ['uq_categorias_nombre', 'uq_categorias_slug', 'nombre', 'slug']) {
      try {
        await conn.query(`ALTER TABLE categorias DROP INDEX \`${uq}\``);
      } catch {
        /* ignore */
      }
    }
    if (!(await indexExists(conn, 'categorias', 'uq_categorias_empresa_slug'))) {
      await conn.query(
        `ALTER TABLE categorias ADD UNIQUE KEY uq_categorias_empresa_slug (id_empresa, slug)`
      );
    }
    if (!(await indexExists(conn, 'categorias', 'uq_categorias_empresa_nombre'))) {
      await conn.query(
        `ALTER TABLE categorias ADD UNIQUE KEY uq_categorias_empresa_nombre (id_empresa, nombre)`
      );
    }
    if (!(await constraintExists(conn, 'categorias', 'fk_categorias_empresa'))) {
      await conn.query(
        `
        ALTER TABLE categorias
        ADD CONSTRAINT fk_categorias_empresa FOREIGN KEY (id_empresa)
          REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
      `
      );
    }
    console.log('OK categorias.id_empresa');
  }

  // productos
  if (!(await columnExists(conn, 'productos', 'id_empresa'))) {
    await conn.query(
      `ALTER TABLE productos ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_producto`
    );
    await conn.query(`UPDATE productos SET id_empresa = ? WHERE id_empresa IS NULL`, [
      idEmpresa
    ]);
    await conn.query(
      `ALTER TABLE productos MODIFY id_empresa INT UNSIGNED NOT NULL`
    );
    for (const uq of ['uq_productos_codigo', 'uq_productos_slug', 'codigo', 'slug']) {
      try {
        await conn.query(`ALTER TABLE productos DROP INDEX \`${uq}\``);
      } catch {
        /* ignore */
      }
    }
    if (!(await indexExists(conn, 'productos', 'uq_productos_empresa_codigo'))) {
      await conn.query(
        `ALTER TABLE productos ADD UNIQUE KEY uq_productos_empresa_codigo (id_empresa, codigo)`
      );
    }
    if (!(await indexExists(conn, 'productos', 'uq_productos_empresa_slug'))) {
      await conn.query(
        `ALTER TABLE productos ADD UNIQUE KEY uq_productos_empresa_slug (id_empresa, slug)`
      );
    }
    if (!(await constraintExists(conn, 'productos', 'fk_productos_empresa'))) {
      await conn.query(
        `
        ALTER TABLE productos
        ADD CONSTRAINT fk_productos_empresa FOREIGN KEY (id_empresa)
          REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
      `
      );
    }
    console.log('OK productos.id_empresa');
  }

  // configuracion_negocio → una por empresa
  if (!(await columnExists(conn, 'configuracion_negocio', 'id_empresa'))) {
    try {
      await conn.query(
        `ALTER TABLE configuracion_negocio DROP CHECK chk_configuracion_unica`
      );
    } catch {
      /* ignore */
    }
    await conn.query(
      `ALTER TABLE configuracion_negocio ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_configuracion`
    );
    await conn.query(
      `UPDATE configuracion_negocio SET id_empresa = ? WHERE id_empresa IS NULL`,
      [idEmpresa]
    );
    await conn.query(
      `ALTER TABLE configuracion_negocio MODIFY id_empresa INT UNSIGNED NOT NULL`
    );
    if (!(await indexExists(conn, 'configuracion_negocio', 'uq_config_empresa'))) {
      await conn.query(
        `ALTER TABLE configuracion_negocio ADD UNIQUE KEY uq_config_empresa (id_empresa)`
      );
    }
    if (!(await constraintExists(conn, 'configuracion_negocio', 'fk_config_empresa'))) {
      await conn.query(
        `
        ALTER TABLE configuracion_negocio
        ADD CONSTRAINT fk_config_empresa FOREIGN KEY (id_empresa)
          REFERENCES empresas(id_empresa) ON UPDATE CASCADE ON DELETE RESTRICT
      `
      );
    }
    // Permitir más de una fila
    try {
      await conn.query(
        `ALTER TABLE configuracion_negocio MODIFY id_configuracion TINYINT UNSIGNED NOT NULL AUTO_INCREMENT`
      );
    } catch {
      /* ignore */
    }
    console.log('OK configuracion_negocio.id_empresa');
  }

  console.log('\nMultiempresa aplicado.');
  await conn.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
