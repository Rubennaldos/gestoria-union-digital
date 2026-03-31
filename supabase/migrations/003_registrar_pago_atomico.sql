-- =============================================================================
-- 003_registrar_pago_atomico.sql
--
-- RPC que registra un pago de cuota de forma ATÓMICA:
--   1. Inserta la fila en cobranzas_pagos (estado = 'aprobado' inmediato)
--   2. Descuenta el monto del saldo en cobranzas_charges
--   3. Marca el cargo como 'pagado' si saldo llega a 0
--
-- Al llamar desde el frontend basta un único supabase.rpc('registrar_pago_atomico', {...})
-- y todos los contadores de deuda en Portal, Lista Admin y Detalle quedan sincronizados.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.registrar_pago_atomico(
  p_charge_id          uuid,
  p_empadronado_id     uuid,
  p_periodo            char(6),
  p_monto              numeric,
  p_monto_original     numeric,
  p_descuento_pp       numeric   DEFAULT 0,
  p_metodo_pago        text      DEFAULT 'efectivo',
  p_fecha_pago         date      DEFAULT CURRENT_DATE,
  p_numero_operacion   text      DEFAULT NULL,
  p_observaciones      text      DEFAULT NULL,
  p_archivo_comprobante text     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago_id     uuid;
  v_saldo_act   numeric;
  v_nuevo_saldo numeric;
  v_nuevo_estado text;
BEGIN
  -- ── 1. Leer saldo del cargo (LOCK para evitar race conditions) ──────────────
  SELECT saldo
    INTO v_saldo_act
    FROM public.cobranzas_charges
   WHERE id = p_charge_id AND anulado = false
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cargo no encontrado o anulado: %', p_charge_id;
  END IF;

  IF v_saldo_act <= 0 THEN
    RAISE EXCEPTION 'El cargo ya está completamente pagado (saldo = 0)';
  END IF;

  -- ── 2. Insertar el pago como APROBADO (registro directo del admin) ──────────
  INSERT INTO public.cobranzas_pagos (
    charge_id,
    empadronado_id,
    periodo,
    monto,
    monto_original,
    descuento_pronto_pago,
    metodo_pago,
    fecha_pago_registrada,
    numero_operacion,
    observaciones,
    archivo_comprobante,
    estado,
    fecha_aprobacion,
    aprobado_por_nombre
  ) VALUES (
    p_charge_id,
    p_empadronado_id,
    p_periodo,
    p_monto,
    p_monto_original,
    NULLIF(p_descuento_pp, 0),
    p_metodo_pago,
    p_fecha_pago,
    p_numero_operacion,
    p_observaciones,
    p_archivo_comprobante,
    'aprobado',
    now(),
    'Sistema'
  )
  RETURNING id INTO v_pago_id;

  -- ── 3. Actualizar saldo del cargo ───────────────────────────────────────────
  v_nuevo_saldo  := GREATEST(0, v_saldo_act - p_monto);
  v_nuevo_estado := CASE WHEN v_nuevo_saldo <= 0 THEN 'pagado' ELSE 'pendiente' END;

  UPDATE public.cobranzas_charges
     SET saldo        = v_nuevo_saldo,
         monto_pagado = monto_pagado + p_monto,
         estado       = v_nuevo_estado,
         updated_at   = now()
   WHERE id = p_charge_id;

  -- ── 4. Devolver el pago recién creado como JSON ─────────────────────────────
  RETURN (
    SELECT jsonb_build_object(
      'id',                   cp.id,
      'charge_id',            cp.charge_id,
      'empadronado_id',       cp.empadronado_id,
      'periodo',              cp.periodo,
      'monto',                cp.monto,
      'monto_original',       cp.monto_original,
      'descuento_pronto_pago',cp.descuento_pronto_pago,
      'metodo_pago',          cp.metodo_pago,
      'fecha_pago_registrada',cp.fecha_pago_registrada,
      'numero_operacion',     cp.numero_operacion,
      'observaciones',        cp.observaciones,
      'archivo_comprobante',  cp.archivo_comprobante,
      'estado',               cp.estado,
      'fecha_creacion',       cp.fecha_creacion,
      'fecha_aprobacion',     cp.fecha_aprobacion,
      'nuevo_saldo_cargo',    v_nuevo_saldo
    )
    FROM public.cobranzas_pagos cp
   WHERE cp.id = v_pago_id
  );
END;
$$;

-- Permisos: solo roles autenticados pueden ejecutarlo
REVOKE ALL ON FUNCTION public.registrar_pago_atomico FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_pago_atomico TO authenticated;

COMMENT ON FUNCTION public.registrar_pago_atomico IS
  'Registra un pago de cuota de forma atómica: inserta en cobranzas_pagos (estado=aprobado) y actualiza saldo en cobranzas_charges en la misma transacción.';
