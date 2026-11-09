
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env.local");
}

const pool = new Pool({
  connectionString,
});

export default pool;
