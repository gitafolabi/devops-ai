import { Pool } from 'pg';

let pool: Pool;

const createPool = (): Pool => {
  const databaseUrl = process.env.DATABASE_URL;
  const opts = { max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 };
  if (databaseUrl) return new Pool({ connectionString: databaseUrl, ...opts });
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'orders_db',
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
      await ensureSchema();
      console.log('Connected to PostgreSQL database for orders service');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) throw error;
      await pool?.end().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

const ensureSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      shipping_address JSONB,
      payment_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_address JSONB,
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
