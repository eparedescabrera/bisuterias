import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { hashPassword, assertPasswordPolicy } from '../utils/passwords.js';
import { uniqueSlug } from '../utils/slug.js';
import { getPlan, listPlanes, SINPE_NUMERO } from '../config/plans.js';

async function slugEmpresaExists(slug) {
  const [rows] = await pool.query(
    'SELECT id_empresa FROM empresas WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows.length > 0;
}

export function getPlanesPublicos() {
  return {
    planes: listPlanes(),
    sinpe: SINPE_NUMERO,
    instruccion:
      'Realice el SINPE al número indicado. Su cuenta se activará cuando el administrador verifique el pago.'
  };
}

/**
 * Registro público: empresa Pendiente + admin del negocio (sin acceso aún).
 */
export async function solicitarSuscripcion(payload) {
  const {
    nombre_negocio,
    propietario,
    correo,
    telefono,
    password,
    plan,
    direccion = null
  } = payload;

  const planMeta = getPlan(plan);
  if (!planMeta) {
    throw new ApiError(400, 'Plan inválido');
  }

  assertPasswordPolicy(password);

  const [dupCorreo] = await pool.query(
    'SELECT id_empresa FROM empresas WHERE correo = ? LIMIT 1',
    [correo]
  );
  if (dupCorreo.length) {
    throw new ApiError(409, 'Ya existe una solicitud con ese correo');
  }

  const slug = await uniqueSlug(nombre_negocio, slugEmpresaExists);
  const nombreUsuarioBase = String(correo)
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 40);
  let nombre_usuario = nombreUsuarioBase || `admin_${Date.now().toString().slice(-6)}`;

  const [dupUser] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE nombre_usuario = ? OR correo = ? LIMIT 1',
    [nombre_usuario, correo]
  );
  if (dupUser.length) {
    nombre_usuario = `${nombre_usuario}_${Date.now().toString().slice(-4)}`;
  }

  const [rolRows] = await pool.query(
    `SELECT id_rol FROM roles WHERE nombre = 'Administrador' LIMIT 1`
  );
  if (!rolRows.length) {
    throw new ApiError(500, 'Rol Administrador no configurado');
  }

  const password_hash = await hashPassword(password);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [emp] = await connection.query(
      `
      INSERT INTO empresas
        (nombre_negocio, slug, propietario, telefono, correo, direccion, plan, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')
    `,
      [nombre_negocio, slug, propietario, telefono, correo, direccion, plan]
    );
    const id_empresa = emp.insertId;

    await connection.query(
      `
      INSERT INTO usuarios
        (nombre_completo, nombre_usuario, correo, password_hash, id_rol, id_empresa, estado)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
      [
        propietario,
        nombre_usuario,
        correo,
        password_hash,
        rolRows[0].id_rol,
        id_empresa
      ]
    );

    await connection.query(
      `
      INSERT INTO configuracion_negocio
        (nombre_negocio, telefono, whatsapp, correo, direccion, moneda,
         mostrar_stock_publico, mensaje_bienvenida, id_empresa)
      VALUES (?, ?, ?, ?, ?, 'CRC', 0, ?, ?)
    `,
      [
        nombre_negocio,
        telefono,
        telefono,
        correo,
        direccion,
        `Bienvenido a ${nombre_negocio}`,
        id_empresa
      ]
    );

    // Categorías base para la nueva empresa
    const cats = [
      ['Pulseras', 'pulseras', 1],
      ['Collares', 'collares', 2],
      ['Aretes', 'aretes', 3],
      ['Anillos', 'anillos', 4],
      ['Conjuntos', 'conjuntos', 5],
      ['Otros', 'otros', 99]
    ];
    for (const [nombre, catSlug, orden] of cats) {
      await connection.query(
        `
        INSERT INTO categorias (nombre, slug, descripcion, orden_visual, id_empresa)
        VALUES (?, ?, ?, ?, ?)
      `,
        [nombre, catSlug, nombre, orden, id_empresa]
      );
    }

    await connection.commit();

    return {
      id_empresa,
      slug,
      nombre_negocio,
      nombre_usuario,
      estado: 'Pendiente',
      plan,
      monto: planMeta.monto,
      sinpe: SINPE_NUMERO,
      mensaje:
        'Gracias por registrarte. Para activar tu cuenta realiza un SINPE. El administrador activará tu cuenta al verificar el pago.'
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getEmpresaPublicaPorId(id_empresa) {
  const [rows] = await pool.query(
    `
    SELECT id_empresa, nombre_negocio, slug, estado, plan, correo, telefono
    FROM empresas WHERE id_empresa = ? AND activo = 1 LIMIT 1
  `,
    [id_empresa]
  );
  if (!rows.length) throw new ApiError(404, 'Empresa no encontrada');
  return rows[0];
}

export default {
  getPlanesPublicos,
  solicitarSuscripcion,
  getEmpresaPublicaPorId
};
