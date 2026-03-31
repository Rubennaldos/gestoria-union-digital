-- =============================================================================
-- 004_deuda_vencida_map.sql
--
-- RPC que calcula la deuda VENCIDA agrupada por empadronado en el servidor.
-- Devuelve una fila por empadronado con su total de deuda, evitando por
-- completo el límite de filas de PostgREST (1000 por defecto).
--
-- Reglas:
--   - estado = 'moroso'    → siempre cuenta (sin importar la fecha)
--   - estado = 'pendiente' + fecha_vencimiento < hoy → también cuenta
--   - saldo > 0
--
-- IMPORTANTE: Ejecutar este SQL en el SQL Editor de Supabase Dashboard.
-- =============================================================================

-- Eliminar la versión anterior si existe (necesario al cambiar el tipo de retorno)
DROP FUNCTION IF EXISTS public.calcular_deuda_vencida_map();

CREATE OR REPLACE FUNCTION public.calcular_deuda_vencida_map()
RETURNS TABLE(empadronado_id uuid, total_deuda numeric, meses_vencidos bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.empadronado_id,
    SUM(cc.saldo)  AS total_deuda,
    COUNT(*)       AS meses_vencidos
  FROM public.cobranzas_charges cc
  WHERE cc.saldo > 0
    AND (
      cc.estado = 'moroso'
      OR (cc.estado = 'pendiente' AND cc.fecha_vencimiento < CURRENT_DATE)
    )
  GROUP BY cc.empadronado_id;
$$;

REVOKE ALL ON FUNCTION public.calcular_deuda_vencida_map FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calcular_deuda_vencida_map TO authenticated;

COMMENT ON FUNCTION public.calcular_deuda_vencida_map IS
  'Devuelve la deuda vencida total y meses vencidos por empadronado (morosos + pendientes vencidos). Ejecuta SUM/GROUP BY en el servidor para evitar el límite de filas de PostgREST.';
