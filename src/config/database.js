import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.mysql.host,
  port: Number(env.mysql.port),
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

export async function testDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

export default pool;
