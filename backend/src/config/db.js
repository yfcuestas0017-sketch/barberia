import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Neon (y casi cualquier Postgres en la nube) exige SSL.
const useSsl =
  process.env.NODE_ENV === "production" ||
  /sslmode=require/.test(process.env.DATABASE_URL || "");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on("error", (error) => {
  console.error("Error en PostgreSQL:", error);
});

export default pool;
