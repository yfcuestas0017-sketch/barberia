-- =====================================================
-- Migración 002
-- 1) Las promociones dejan de depender de un servicio:
--    ahora son ofertas propias (nombre, precio, duración, foto, fechas).
-- 2) Una cita puede ser de un SERVICIO normal o de una PROMOCIÓN.
-- 3) Rellena los ingresos (movimientos) de citas ya completadas
--    que no tengan movimiento registrado.
-- Es seguro ejecutarla varias veces (idempotente).
-- Ejecutar en pgAdmin (Query Tool) DESPUÉS de la 001.
-- =====================================================

BEGIN;

-- 1) promociones: duración propia -----------------------------------
ALTER TABLE promociones
  ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER NOT NULL DEFAULT 30;

-- Si venían ligadas a un servicio, conservamos su duración
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'promociones' AND column_name = 'id_servicio'
  ) THEN
    UPDATE promociones p
    SET duracion_minutos = s.duracion_minutos
    FROM servicios s
    WHERE s.id_servicio = p.id_servicio;
  END IF;
END $$;

-- Ya no se vinculan con servicios
DROP INDEX IF EXISTS idx_promociones_id_servicio;
ALTER TABLE promociones DROP COLUMN IF EXISTS id_servicio;

-- 2) citas: servicio O promoción -----------------------------------
ALTER TABLE citas ALTER COLUMN id_servicio DROP NOT NULL;

-- Una promoción con citas no se puede borrar (se desactiva en su lugar)
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_id_promocion_fkey;
ALTER TABLE citas
  ADD CONSTRAINT citas_id_promocion_fkey
  FOREIGN KEY (id_promocion)
  REFERENCES promociones (id_promocion)
  ON DELETE RESTRICT;

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_servicio_o_promocion_chk;
ALTER TABLE citas
  ADD CONSTRAINT citas_servicio_o_promocion_chk
  CHECK (id_servicio IS NOT NULL OR id_promocion IS NOT NULL);

-- 3) Backfill de ingresos -----------------------------------------
INSERT INTO movimientos
  (tipo, concepto, monto, fecha, id_usuario, id_cita, observacion)
SELECT
  'INGRESO',
  CASE
    WHEN p.id_promocion IS NOT NULL THEN 'Promoción: ' || p.nombre
    ELSE 'Servicio: ' || COALESCE(s.nombre, 'Servicio')
  END,
  c.precio,
  c.fecha,
  b.id_usuario,
  c.id_cita,
  'Registrado automáticamente (cita completada)'
FROM citas c
INNER JOIN barberos b ON b.id_barbero = c.id_barbero
LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
LEFT JOIN promociones p ON p.id_promocion = c.id_promocion
WHERE c.estado = 'COMPLETADA'
  AND NOT EXISTS (
    SELECT 1 FROM movimientos m WHERE m.id_cita = c.id_cita
  );

COMMIT;
