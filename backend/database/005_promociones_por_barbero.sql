-- =====================================================
-- Migración 005
-- 1) Un barbero puede crear sus propias promociones
--    (promociones.id_barbero_creador; NULL = creada por el admin).
-- 2) Cada promoción define QUÉ barberos la atienden
--    (tabla promocion_barberos).
-- 3) Las promociones que ya existían se asignan a TODOS los barberos,
--    para que el comportamiento actual no cambie. Luego el admin
--    puede quitar barberos desde el panel de promociones.
-- Es seguro ejecutarla varias veces (idempotente).
-- Ejecutar en pgAdmin (Query Tool) DESPUÉS de la 004.
-- =====================================================

BEGIN;

-- 1) Quién creó la promoción --------------------------------------
ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS id_barbero_creador BIGINT;

ALTER TABLE promociones
  DROP CONSTRAINT IF EXISTS promociones_id_barbero_creador_fkey;

ALTER TABLE promociones
  ADD CONSTRAINT promociones_id_barbero_creador_fkey
  FOREIGN KEY (id_barbero_creador)
  REFERENCES barberos (id_barbero)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promociones_barbero_creador
  ON promociones (id_barbero_creador);

-- 2) Barberos que atienden cada promoción -------------------------
CREATE TABLE IF NOT EXISTS promocion_barberos (
  id_promocion BIGINT NOT NULL
    REFERENCES promociones (id_promocion) ON DELETE CASCADE,
  id_barbero BIGINT NOT NULL
    REFERENCES barberos (id_barbero) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_promocion, id_barbero)
);

CREATE INDEX IF NOT EXISTS idx_promocion_barberos_barbero
  ON promocion_barberos (id_barbero);

-- 3) Promociones existentes -> todos los barberos -----------------
INSERT INTO promocion_barberos (id_promocion, id_barbero)
SELECT p.id_promocion, b.id_barbero
FROM promociones p
CROSS JOIN barberos b
WHERE NOT EXISTS (
  SELECT 1 FROM promocion_barberos pb
  WHERE pb.id_promocion = p.id_promocion
)
ON CONFLICT DO NOTHING;

COMMIT;
