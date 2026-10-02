-- =====================================================
-- Migración 001
-- 1) Vincula cada promoción con un servicio
-- 2) Permite registrar en la cita qué promoción se usó
-- Es seguro ejecutarla varias veces (idempotente).
-- Ejecutar en pgAdmin (Query Tool) sobre la base de datos de la barbería.
-- =====================================================

-- 1) promociones -> servicios
ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS id_servicio BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promociones_id_servicio_fkey'
  ) THEN
    ALTER TABLE promociones
      ADD CONSTRAINT promociones_id_servicio_fkey
      FOREIGN KEY (id_servicio)
      REFERENCES servicios (id_servicio)
      ON DELETE CASCADE;   -- si se elimina el servicio, se eliminan sus promociones
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_promociones_id_servicio
  ON promociones (id_servicio);

-- 2) citas -> promociones (opcional)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS id_promocion BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citas_id_promocion_fkey'
  ) THEN
    ALTER TABLE citas
      ADD CONSTRAINT citas_id_promocion_fkey
      FOREIGN KEY (id_promocion)
      REFERENCES promociones (id_promocion)
      ON DELETE SET NULL;  -- si se elimina la promoción, la cita se conserva
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_citas_id_promocion
  ON citas (id_promocion);

-- NOTA: las promociones que ya existían quedan con id_servicio = NULL.
-- Edítalas desde el panel de admin y asígnales un servicio para que
-- aparezcan a los clientes.
