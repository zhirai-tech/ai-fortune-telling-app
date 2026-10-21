import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (pool) return pool;

  const host = (process.env.MYSQL_HOST ?? '').trim();
  const port = Number(process.env.MYSQL_PORT ?? '3306');
  const user = (process.env.MYSQL_USER ?? '').trim();
  const password = (process.env.MYSQL_PASSWORD ?? '').trim();
  const database = (process.env.MYSQL_DATABASE ?? '').trim();

  if (!host || !user || !database) {
    throw new Error('mysql_env_missing');
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true
  });

  return pool;
}

export async function query(sql, params) {
  const p = getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

export async function exec(sql, params) {
  const p = getPool();
  const [res] = await p.execute(sql, params);
  return res;
}
