-- =====================================================
-- Migración 004
-- Códigos de recuperación de contraseña (enviados por WhatsApp).
-- El código NUNCA se guarda en claro: solo su hash.
-- Es idempotente. Ejecutar en pgAdmin (Query Tool).
-- =====================================================

CREATE TABLE IF NOT EXISTS codigos_recuperacion (
  id_codigo    BIGSERIAL PRIMARY KEY,
  id_usuario   BIGINT NOT NULL
               REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  codigo_hash  TEXT NOT NULL,
  expira_en    TIMESTAMPTZ NOT NULL,
  intentos     INTEGER NOT NULL DEFAULT 0,
  verificado   BOOLEAN NOT NULL DEFAULT FALSE,
  usado        BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codigos_recuperacion_usuario
  ON codigos_recuperacion (id_usuario, creado_en DESC);
