import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@db:5432/ticker_score";

const pool = new Pool({ connectionString });

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function closePool() {
  await pool.end();
}