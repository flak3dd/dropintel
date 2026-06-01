import pg from 'pg';
const { Pool } = pg;
type PoolType = InstanceType<typeof Pool>;

let pool: PoolType | null = null;

export function getPool(): PoolType {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  try {
    const result = await getPool().query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.warn('[db] query failed:', (err as Error).message);
    return [];
  }
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
