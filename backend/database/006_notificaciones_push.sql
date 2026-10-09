-- =====================================================
-- Migración 006
-- Suscripciones de notificaciones push (celular / PC).
-- Un usuario puede tener varios dispositivos suscritos.
-- Es idempotente. Ejecutar en pgAdmin (Query Tool) o en Neon (SQL Editor).
-- =====================================================

CREATE TABLE IF NOT EXISTS push_suscripciones (
  id_suscripcion BIGSERIAL PRIMARY KEY,
  id_usuario     BIGINT NOT NULL
                 REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL UNIQUE,
  p256dh         TEXT NOT NULL,
  auth           TEXT NOT NULL,
  user_agent     TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_suscripciones_usuario
  ON push_suscripciones (id_usuario);
