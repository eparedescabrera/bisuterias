import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import { uniqueSlug } from '../utils/slug.js';
import { parsePagination, buildMeta } from '../utils/pagination.js';

async function slugExists(id_empresa, slug, excludeId = null) {
  const params = [id_empresa, slug];
  let sql = 'SELECT id_categoria FROM categorias WHERE id_empresa = ? AND slug = ?';
  if (excludeId) {
    sql += ' AND id_categoria <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

export async function listCategorias(id_empresa, query = {}) {
  const { pagina, limite, offset } = parsePagination(query);
  const where = ['id_empresa = ?'];
  const params = [id_empresa];

  if (query.busqueda) {
    where.push('(nombre LIKE ? OR slug LIKE ? OR descripcion LIKE ?)');
    const like = `%${query.busqueda}%`;
    params.push(like, like, like);
  }

  if (query.activo !== undefined) {
    where.push('activo = ?');
    params.push(query.activo === 'true' || query.activo === true || query.activo === '1' ? 1 : 0);
  }

  const whereSql = where.join(' AND ');

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM categorias WHERE ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `
    SELECT id_categoria, nombre, slug, descripcion, imagen_url, estado, activo,
           orden_visual, fecha_creacion, fecha_actualizacion
    FROM categorias
    WHERE ${whereSql}
    ORDER BY orden_visual ASC, nombre ASC
    LIMIT ? OFFSET ?
  `,
    [...params, limite, offset]
  );

  return {
    data: rows,
    meta: buildMeta(countRows[0].total, pagina, limite)
  };
}

export async function getCategoriaById(id_empresa, id) {
  const [rows] = await pool.query(
    `
    SELECT id_categoria, nombre, slug, descripcion, imagen_url, imagen_public_id,
           estado, activo, orden_visual, fecha_creacion, fecha_actualizacion
    FROM categorias
    WHERE id_categoria = ? AND id_empresa = ?
    LIMIT 1
  `,
    [id, id_empresa]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Categoría no encontrada');
  }

  return rows[0];
}

export async function createCategoria(id_empresa, payload) {
  const nombre = String(payload.nombre).trim();

  const [dup] = await pool.query(
    `
    SELECT id_categoria FROM categorias
    WHERE id_empresa = ? AND LOWER(nombre) = LOWER(?)
    LIMIT 1
  `,
    [id_empresa, nombre]
  );
  if (dup.length) {
    throw new ApiError(409, 'Ya existe una categoría con ese nombre');
  }

  const slug = await uniqueSlug(nombre, (s) => slugExists(id_empresa, s));
  const estado = payload.estado === undefined ? 1 : payload.estado ? 1 : 0;
  const orden_visual = Number(payload.orden_visual || 0);
  const descripcion = payload.descripcion || null;

  const [result] = await pool.query(
    `
    INSERT INTO categorias (id_empresa, nombre, slug, descripcion, estado, activo, orden_visual)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `,
    [id_empresa, nombre, slug, descripcion, estado, orden_visual]
  );

  return getCategoriaById(id_empresa, result.insertId);
}

export async function updateCategoria(id_empresa, id, payload) {
  const current = await getCategoriaById(id_empresa, id);

  const nombre =
    payload.nombre !== undefined ? String(payload.nombre).trim() : current.nombre;

  if (payload.nombre !== undefined) {
    const [dup] = await pool.query(
      `
      SELECT id_categoria FROM categorias
      WHERE id_empresa = ? AND LOWER(nombre) = LOWER(?) AND id_categoria <> ?
      LIMIT 1
    `,
      [id_empresa, nombre, id]
    );
    if (dup.length) {
      throw new ApiError(409, 'Ya existe una categoría con ese nombre');
    }
  }

  let slug = current.slug;
  if (payload.nombre !== undefined && nombre !== current.nombre) {
    slug = await uniqueSlug(nombre, (s) => slugExists(id_empresa, s, id));
  }

  const descripcion =
    payload.descripcion !== undefined ? payload.descripcion : current.descripcion;
  const estado =
    payload.estado !== undefined ? (payload.estado ? 1 : 0) : current.estado;
  const orden_visual =
    payload.orden_visual !== undefined
      ? Number(payload.orden_visual)
      : current.orden_visual;

  await pool.query(
    `
    UPDATE categorias
    SET nombre = ?, slug = ?, descripcion = ?, estado = ?, orden_visual = ?
    WHERE id_categoria = ? AND id_empresa = ?
  `,
    [nombre, slug, descripcion, estado, orden_visual, id, id_empresa]
  );

  return getCategoriaById(id_empresa, id);
}

export async function deleteCategoria(id_empresa, id) {
  await getCategoriaById(id_empresa, id);

  await pool.query(
    `
    UPDATE categorias SET activo = 0, estado = 0
    WHERE id_categoria = ? AND id_empresa = ?
  `,
    [id, id_empresa]
  );

  return true;
}

export default {
  listCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria
};
