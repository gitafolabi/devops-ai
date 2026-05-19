import { Pool } from 'pg';

let pool: Pool;

const createPool = (): Pool => {
  const databaseUrl = process.env.DATABASE_URL;
  const opts = { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };
  if (databaseUrl) return new Pool({ connectionString: databaseUrl, ...opts });
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'boutique_auth',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ...opts,
  });
};

export const connectDB = async (retries = 10, delayMs = 3000): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = createPool();
      await pool.query('SELECT NOW()');
      console.log('Connected to PostgreSQL database');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) throw error;
      await pool?.end().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

export const query = (text: string, params?: any[]): Promise<any> => {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool.query(text, params);
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
};