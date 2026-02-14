// server/db.ts
import pkg from 'pg';
const { Pool } = pkg;

// Uses the URL from your .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// A helper function to run queries
export const query = (text: string, params?: any[]) => {
  console.log(`[DB_QUERY] Executing: ${text}`);
  return pool.query(text, params);
};

export default pool;