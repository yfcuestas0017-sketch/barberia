import pool from "./db.js";

// Garantiza (de forma idempotente) la columna "eliminado" usada para
// archivar servicios, barberos y promociones con historial.
export const ensureSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE servicios   ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE barberos    ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE promociones ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    console.log("Esquema verificado (columna eliminado)");
  } catch (error) {
    console.error("No se pudo verificar el esquema:", error.message);
  }
};
