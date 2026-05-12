import { Pool } from 'pg';

let pool: Pool;

export const connectDB = async (): Promise<void> => {
  try {
    // Use DATABASE_URL if available, otherwise fall back to individual env vars
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'orders_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    await pool.query('SELECT NOW()');
    await ensureSchema();
    console.log('Connected to PostgreSQL database for orders service');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
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
