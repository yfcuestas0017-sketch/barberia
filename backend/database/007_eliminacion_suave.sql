-- =====================================================
-- Migración 007 — Eliminación "suave" (archivado)
-- Servicios, barberos y promociones que ya tienen citas / reseñas /
-- movimientos no se pueden borrar sin destruir el historial.
-- En su lugar se marcan como eliminado = TRUE: desaparecen del panel
-- y de la web, pero los reportes e ingresos antiguos se conservan.
-- Idempotente. (El backend también la aplica solo al arrancar.)
-- =====================================================
ALTER TABLE servicios   ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE barberos    ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE promociones ADD COLUMN IF NOT EXISTS eliminado BOOLEAN NOT NULL DEFAULT FALSE;
