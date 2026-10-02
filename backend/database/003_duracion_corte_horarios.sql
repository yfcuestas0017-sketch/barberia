-- =====================================================
-- Migración 003
-- Agrega a cada bloque de horario del barbero la duración
-- (en minutos) de cada corte. Con eso el bloque se divide
-- en turnos: hora de ingreso -> hora de salida.
-- Es idempotente. Ejecutar en pgAdmin (Query Tool).
-- =====================================================

ALTER TABLE horarios_barbero
  ADD COLUMN IF NOT EXISTS duracion_corte INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horarios_barbero_duracion_corte_chk'
  ) THEN
    ALTER TABLE horarios_barbero
      ADD CONSTRAINT horarios_barbero_duracion_corte_chk
      CHECK (duracion_corte IS NULL OR duracion_corte BETWEEN 5 AND 240);
  END IF;
END $$;
