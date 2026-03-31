// src/services/cobranzas-v2.ts
// =============================================================================
//  Módulo de Cobranzas V2 — Supabase PostgreSQL
//
//  Tablas usadas:
//    cobranzas_configuracion   (single-row config)
//    cobranzas_charges         (cargos mensuales por empadronado)
//    cobranzas_pagos           (pagos registrados)
//    cobranzas_periodos        (locks de períodos)
//    movimientos_financieros   (ingresos / egresos)
// =============================================================================

import { supabase } from '@/lib/supabase';
import {
  ConfiguracionCobranzasV2,
  ChargeV2,
  PagoV2,
  IngresoV2,
  EgresoV2,
  EstadisticasV2,
} from '@/types/cobranzas-v2';
import { getEmpadronados } from '@/services/empadronados';

// =============================================================================
// 1. HELPERS DE FECHA
// =============================================================================

function formatPeriod(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentPeriod(): string {
  return formatPeriod(new Date());
}

/** epoch ms → 'YYYY-MM-DD' para columnas `date` de PostgreSQL */
function epochToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → epoch ms (mediodía UTC para evitar desfases de zona horaria) */
function dateToEpoch(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getTime();
}

/** Primer y último día del siguiente mes (para rangos de consulta) */
function nextMonthStart(year: number, month: number): string {
  const nm = month === 12 ? 1 : month + 1;
  const ny = month === 12 ? year + 1 : year;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_REGEX.test(v);
}

// =============================================================================
// 2. MAPPERS  (fila BD → tipo TypeScript)
// =============================================================================

function fromConfigRow(r: Record<string, unknown>): ConfiguracionCobranzasV2 {
  return {
    montoMensual:            Number(r.monto_mensual),
    diaCierre:               Number(r.dia_cierre),
    diaVencimiento:          Number(r.dia_vencimiento),
    diasProntoPago:          Number(r.dias_pronto_pago),
    porcentajeProntoPago:    Number(r.porcentaje_pronto_pago),
    porcentajeMorosidad:     Number(r.porcentaje_morosidad),
    serieComprobantes:       String(r.serie_comprobantes ?? '001'),
    numeroComprobanteActual: Number(r.numero_comprobante_actual ?? 1),
    sede:                    String(r.sede ?? 'JPUSAP'),
  };
}

function fromChargeRow(r: Record<string, unknown>): ChargeV2 {
  return {
    id:             String(r.id),
    empadronadoId:  String(r.empadronado_id),
    periodo:        String(r.periodo),
    montoOriginal:  Number(r.monto_original),
    montoPagado:    Number(r.monto_pagado),
    saldo:          Number(r.saldo),
    fechaVencimiento: r.fecha_vencimiento ? dateToEpoch(String(r.fecha_vencimiento)) : 0,
    fechaCreacion:  r.created_at ? new Date(String(r.created_at)).getTime() : 0,
    estado:         r.estado as ChargeV2['estado'],
    esMoroso:       Boolean(r.es_moroso),
    montoMorosidad: r.monto_morosidad != null ? Number(r.monto_morosidad) : undefined,
    anulado:        Boolean(r.anulado),
    fechaAnulacion: r.fecha_anulacion ? new Date(String(r.fecha_anulacion)).getTime() : undefined,
    anuladoPor:        (r.anulado_por     as string | undefined) ?? undefined,
    anuladoPorNombre:  (r.anulado_por_nombre as string | undefined) ?? undefined,
    motivoAnulacion:   (r.motivo_anulacion  as string | undefined) ?? undefined,
  };
}

function fromPagoRow(r: Record<string, unknown>): PagoV2 {
  return {
    id:            String(r.id),
    chargeId:      String(r.charge_id),
    empadronadoId: String(r.empadronado_id),
    periodo:       String(r.periodo),
    monto:         Number(r.monto),
    montoOriginal: Number(r.monto_original),
    descuentoProntoPago: r.descuento_pronto_pago != null ? Number(r.descuento_pronto_pago) : undefined,
    metodoPago:    r.metodo_pago as PagoV2['metodoPago'],
    numeroOperacion: (r.numero_operacion as string | undefined) ?? undefined,
    estado:          r.estado as PagoV2['estado'],
    fechaPagoRegistrada: r.fecha_pago_registrada ? dateToEpoch(String(r.fecha_pago_registrada)) : 0,
    fechaCreacion:       r.fecha_creacion ? new Date(String(r.fecha_creacion)).getTime() : 0,
    fechaModificacion:   r.fecha_modificacion ? new Date(String(r.fecha_modificacion)).getTime() : undefined,
    archivoComprobante:  (r.archivo_comprobante  as string | undefined) ?? undefined,
    fechaAprobacion:     r.fecha_aprobacion ? new Date(String(r.fecha_aprobacion)).getTime() : undefined,
    aprobadoPor:         (r.aprobado_por     as string | undefined) ?? undefined,
    aprobadoPorNombre:   (r.aprobado_por_nombre as string | undefined) ?? undefined,
    comentarioAprobacion:(r.comentario_aprobacion as string | undefined) ?? undefined,
    fechaRechazo:        r.fecha_rechazo ? new Date(String(r.fecha_rechazo)).getTime() : undefined,
    motivoRechazo:       (r.motivo_rechazo  as string | undefined) ?? undefined,
    observaciones:       (r.observaciones   as string | undefined) ?? undefined,
  };
}

// =============================================================================
// 3. CONFIGURACIÓN
// =============================================================================

const DEFAULT_CONFIG: ConfiguracionCobranzasV2 = {
  montoMensual:            50,
  diaCierre:               14,
  diaVencimiento:          15,
  diasProntoPago:          3,
  porcentajeProntoPago:    5,
  porcentajeMorosidad:     10,
  serieComprobantes:       '001',
  numeroComprobanteActual: 1,
  sede:                    'JPUSAP',
};

export async function obtenerConfiguracionV2(): Promise<ConfiguracionCobranzasV2> {
  const { data, error } = await supabase
    .from('cobranzas_configuracion')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error obteniendo configuración V2:', error.message);
    return DEFAULT_CONFIG;
  }

  return data ? fromConfigRow(data) : DEFAULT_CONFIG;
}

export async function actualizarConfiguracionV2(
  config: Partial<ConfiguracionCobranzasV2>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (config.montoMensual            != null) updates.monto_mensual              = config.montoMensual;
  if (config.diaCierre               != null) updates.dia_cierre                 = config.diaCierre;
  if (config.diaVencimiento          != null) updates.dia_vencimiento            = config.diaVencimiento;
  if (config.diasProntoPago          != null) updates.dias_pronto_pago           = config.diasProntoPago;
  if (config.porcentajeProntoPago    != null) updates.porcentaje_pronto_pago     = config.porcentajeProntoPago;
  if (config.porcentajeMorosidad     != null) updates.porcentaje_morosidad       = config.porcentajeMorosidad;
  if (config.serieComprobantes       != null) updates.serie_comprobantes         = config.serieComprobantes;
  if (config.numeroComprobanteActual != null) updates.numero_comprobante_actual  = config.numeroComprobanteActual;
  if (config.sede                    != null) updates.sede                       = config.sede;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('cobranzas_configuracion')
    .update(updates)
    .eq('id', 1);

  if (error) {
    console.error('Error actualizando configuración V2:', error.message);
    throw error;
  }
}

// =============================================================================
// 4. LOCKS DE PERÍODO
// =============================================================================

async function isPeriodGenerated(period: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('cobranzas_periodos')
    .select('generado')
    .eq('periodo', period)
    .maybeSingle();

  if (error) {
    console.error('Error verificando período generado:', error.message);
    return false;
  }
  return data?.generado === true;
}

async function markPeriodGenerated(period: string, generadoPor: string): Promise<void> {
  const { error } = await supabase
    .from('cobranzas_periodos')
    .upsert(
      {
        periodo:          period,
        generado:         true,
        fecha_generacion: new Date().toISOString(),
        generado_por:     isUUID(generadoPor) ? generadoPor : null,
      },
      { onConflict: 'periodo' }
    );

  if (error) {
    console.error('Error marcando período como generado:', error.message);
    throw error;
  }
}

// =============================================================================
// 5. CÁLCULO DE FECHAS (misma lógica de negocio, sin Firebase)
// =============================================================================

function calculateChargeDate(_empadronado: unknown, _config: ConfiguracionCobranzasV2): Date {
  // Política: todos los empadronados habilitados cobran desde 01/01/2025
  return new Date(2025, 0, 1);
}

function calculateDueDate(chargeDate: Date, config: ConfiguracionCobranzasV2): Date {
  return new Date(chargeDate.getFullYear(), chargeDate.getMonth(), config.diaVencimiento);
}

// =============================================================================
// 6. GENERACIÓN DE CARGOS
// =============================================================================

export async function generarCargoMensual(
  empadronadoId: string,
  period: string,
  config: ConfiguracionCobranzasV2
): Promise<ChargeV2 | null> {
  try {
    // Verificar si ya existe cargo para este período
    const { data: existing } = await supabase
      .from('cobranzas_charges')
      .select('id')
      .eq('empadronado_id', empadronadoId)
      .eq('periodo', period)
      .maybeSingle();

    if (existing) return null;

    // Verificar que el empadronado exista y esté habilitado
    const empadronados = await getEmpadronados();
    const empadronado  = empadronados.find(e => e.id === empadronadoId);
    if (!empadronado || !empadronado.habilitado) return null;

    const chargeStartDate = calculateChargeDate(empadronado, config);
    const periodDate = new Date(
      parseInt(period.slice(0, 4)),
      parseInt(period.slice(4)) - 1,
      1
    );
    if (periodDate < chargeStartDate) return null;

    const dueDate = calculateDueDate(periodDate, config);

    const { data, error } = await supabase
      .from('cobranzas_charges')
      .insert({
        empadronado_id:   empadronadoId,
        periodo:          period,
        monto_original:   config.montoMensual,
        monto_pagado:     0,
        saldo:            config.montoMensual,
        fecha_vencimiento: dueDate.toISOString().slice(0, 10),
        estado:           'pendiente',
        es_moroso:        false,
      })
      .select()
      .single();

    if (error) {
      // Conflicto de unicidad (race condition): ya existía
      if (error.code === '23505') return null;
      throw error;
    }

    return fromChargeRow(data);
  } catch (error) {
    console.error('Error generando cargo mensual:', error);
    throw error;
  }
}

/** Versión optimizada que recibe el empadronado directamente (evita re-fetch) */
async function generarCargoMensualOptimizado(
  empadronado: { id: string; habilitado: boolean },
  period: string,
  config: ConfiguracionCobranzasV2
): Promise<ChargeV2 | null> {
  try {
    if (!empadronado.habilitado) return null;

    const { data: existing } = await supabase
      .from('cobranzas_charges')
      .select('id')
      .eq('empadronado_id', empadronado.id)
      .eq('periodo', period)
      .maybeSingle();

    if (existing) return null;

    const chargeStartDate = calculateChargeDate(empadronado, config);
    const periodDate = new Date(
      parseInt(period.slice(0, 4)),
      parseInt(period.slice(4)) - 1,
      1
    );
    if (periodDate < chargeStartDate) return null;

    const dueDate = calculateDueDate(periodDate, config);

    const { data, error } = await supabase
      .from('cobranzas_charges')
      .insert({
        empadronado_id:    empadronado.id,
        periodo:           period,
        monto_original:    config.montoMensual,
        monto_pagado:      0,
        saldo:             config.montoMensual,
        fecha_vencimiento: dueDate.toISOString().slice(0, 10),
        estado:            'pendiente',
        es_moroso:         false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return null;
      return null; // log silencioso para no interrumpir el batch
    }

    return fromChargeRow(data);
  } catch {
    return null;
  }
}

export async function generarMesActual(generadoPor: string): Promise<void> {
  const config        = await obtenerConfiguracionV2();
  const currentPeriod = getCurrentPeriod();
  const empadronados  = await getEmpadronados();
  const activos       = empadronados.filter(e => e.habilitado);

  console.log(`Generando mes actual ${currentPeriod} para ${activos.length} empadronados`);

  let cargosGenerados = 0;
  const BATCH = 50;

  for (let i = 0; i < activos.length; i += BATCH) {
    const batch   = activos.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(emp => generarCargoMensualOptimizado(emp, currentPeriod, config))
    );
    cargosGenerados += results.filter(Boolean).length;
  }

  if (!(await isPeriodGenerated(currentPeriod))) {
    await markPeriodGenerated(currentPeriod, generadoPor);
  }

  console.log(
    cargosGenerados === 0
      ? `El período ${currentPeriod} ya estaba completamente generado`
      : `Generación completada para ${currentPeriod}. ${cargosGenerados} cargos nuevos.`
  );
}

/** Genera todos los períodos desde Enero 2025 hasta el mes actual */
export async function generarDesdeEnero2025(generadoPor: string): Promise<void> {
  const config       = await obtenerConfiguracionV2();
  const empadronados = await getEmpadronados();
  const activos      = empadronados.filter(e => e.habilitado);

  const currentDate = new Date();
  const periods: string[] = [];
  const tempDate = new Date(2025, 0, 1);

  while (tempDate <= currentDate) {
    periods.push(formatPeriod(tempDate));
    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  console.log(`Períodos a generar: ${periods.join(', ')}`);
  console.log(`Empadronados activos: ${activos.length}`);

  let cargosGenerados = 0;
  const BATCH = 50;

  for (const period of periods) {
    for (let i = 0; i < activos.length; i += BATCH) {
      const batch   = activos.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(emp => generarCargoMensualOptimizado(emp, period, config))
      );
      cargosGenerados += results.filter(Boolean).length;
    }

    if (!(await isPeriodGenerated(period))) {
      await markPeriodGenerated(period, generadoPor);
    }
  }

  console.log(`Backfill completado. ${cargosGenerados} cargos nuevos generados.`);
}

/**
 * Verificación automática: genera el mes actual (y proactivamente el siguiente)
 * si aún no han sido generados.
 */
export async function verificarYGenerarCargosAutomaticos(): Promise<{
  cargosGenerados: number;
  cierreEjecutado: boolean;
  mensaje: string;
}> {
  try {
    // Comprobar si el backfill desde Enero 2025 ya se hizo
    // (si existen charges para 202501 asumimos que está listo)
    const { count: chargesEnero2025 } = await supabase
      .from('cobranzas_charges')
      .select('id', { count: 'exact', head: true })
      .eq('periodo', '202501');

    let cargosGenerados = 0;

    if (!chargesEnero2025) {
      // Primer arranque: generar todos desde Enero 2025
      console.log('🔄 Iniciando backfill de cargos desde Enero 2025…');
      const [config, empadronados] = await Promise.all([
        obtenerConfiguracionV2(),
        getEmpadronados(),
      ]);
      const activos = empadronados.filter(e => e.habilitado);

      const currentDate = new Date();
      const periods: string[] = [];
      const tempDate = new Date(2025, 0, 1);

      while (tempDate <= currentDate) {
        periods.push(formatPeriod(tempDate));
        tempDate.setMonth(tempDate.getMonth() + 1);
      }

      const BATCH = 50;
      for (const period of periods) {
        for (let i = 0; i < activos.length; i += BATCH) {
          const batch   = activos.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map(emp => generarCargoMensualOptimizado(emp, period, config))
          );
          cargosGenerados += results.filter(Boolean).length;
        }
      }

      console.log(`✅ Backfill completado. ${cargosGenerados} cargos nuevos.`);
    } else {
      // Solo generar el mes actual si falta
      const currentDate   = new Date();
      const currentPeriod = formatPeriod(currentDate);

      if (!(await isPeriodGenerated(currentPeriod))) {
        const [config, empadronados] = await Promise.all([
          obtenerConfiguracionV2(),
          getEmpadronados(),
        ]);
        const activos = empadronados.filter(e => e.habilitado);
        const BATCH   = 50;

        for (let i = 0; i < activos.length; i += BATCH) {
          const batch   = activos.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map(emp => generarCargoMensualOptimizado(emp, currentPeriod, config))
          );
          cargosGenerados += results.filter(Boolean).length;
        }

        await markPeriodGenerated(currentPeriod, 'sistema_automatico');
      }

      // Generación proactiva del mes siguiente (día 24 en adelante)
      if (currentDate.getDate() >= 24) {
        const nextDate   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const nextPeriod = formatPeriod(nextDate);

        if (!(await isPeriodGenerated(nextPeriod))) {
          console.log(`🚀 Generación proactiva del período siguiente: ${nextPeriod}`);
          const [config, empadronados] = await Promise.all([
            obtenerConfiguracionV2(),
            getEmpadronados(),
          ]);
          const activos = empadronados.filter(e => e.habilitado);
          const BATCH   = 50;

          for (let i = 0; i < activos.length; i += BATCH) {
            const batch   = activos.slice(i, i + BATCH);
            const results = await Promise.all(
              batch.map(emp => generarCargoMensualOptimizado(emp, nextPeriod, config))
            );
            cargosGenerados += results.filter(Boolean).length;
          }

          await markPeriodGenerated(nextPeriod, 'sistema_automatico_proactivo');
        }
      }
    }

    return {
      cargosGenerados,
      cierreEjecutado: false,
      mensaje: cargosGenerados > 0 ? `${cargosGenerados} cargos generados` : '',
    };
  } catch (error) {
    console.error('Error en verificación automática:', error);
    return { cargosGenerados: 0, cierreEjecutado: false, mensaje: '' };
  }
}

/**
 * Corrige fechas de vencimiento (función legacy — ya no necesaria en Supabase).
 * Se mantiene para compatibilidad con el código existente.
 */
export async function corregirFechasVencimiento(): Promise<number> {
  return 0;
}

// =============================================================================
// 7. REGISTRAR PAGO
// =============================================================================

export async function registrarPagoV2(
  chargeId: string,
  monto: number,
  metodoPago: string,
  fechaPagoRegistrada: number,
  archivoComprobante?: string,
  numeroOperacion?: string,
  observaciones?: string
): Promise<PagoV2> {
  // Obtener cargo para tener empadronado_id y periodo
  const { data: chargeRow, error: chargeErr } = await supabase
    .from('cobranzas_charges')
    .select('id, empadronado_id, periodo, saldo, monto_original')
    .eq('id', chargeId)
    .maybeSingle();

  if (chargeErr) throw chargeErr;
  if (!chargeRow) throw new Error('Cargo no encontrado');
  if (Number(chargeRow.saldo) <= 0) throw new Error('El cargo ya está pagado');

  // Validación de número de operación duplicado (solo para pagos manuales con nro. de operación)
  if (numeroOperacion && !numeroOperacion.startsWith('REG-')) {
    const { data: existente, error: dupErr } = await supabase
      .from('cobranzas_pagos')
      .select('id')
      .eq('empadronado_id', chargeRow.empadronado_id)
      .eq('numero_operacion', numeroOperacion)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (existente) throw new Error(`El número de operación "${numeroOperacion}" ya existe para este asociado. Verifique que no sea un pago duplicado.`);
  }

  // Descuento por pronto pago
  const config = await obtenerConfiguracionV2();
  let descuentoProntoPago = 0;
  const periodo = String(chargeRow.periodo);

  if (config.diasProntoPago > 0) {
    const periodStart = new Date(
      parseInt(periodo.slice(0, 4)),
      parseInt(periodo.slice(4)) - 1,
      1
    );
    const dias = Math.floor((Date.now() - periodStart.getTime()) / 86_400_000);
    if (dias <= config.diasProntoPago) {
      descuentoProntoPago = (Number(chargeRow.monto_original) * config.porcentajeProntoPago) / 100;
    }
  }

  const montoFinal = Math.max(0, monto - descuentoProntoPago);

  // ── Llamada atómica al RPC: inserta pago + actualiza saldo en una transacción ──
  const { data: rpcData, error: rpcErr } = await supabase.rpc('registrar_pago_atomico', {
    p_charge_id:           chargeId,
    p_empadronado_id:      chargeRow.empadronado_id as string,
    p_periodo:             periodo,
    p_monto:               montoFinal,
    p_monto_original:      monto,
    p_descuento_pp:        descuentoProntoPago,
    p_metodo_pago:         metodoPago,
    p_fecha_pago:          epochToDate(fechaPagoRegistrada),
    p_numero_operacion:    numeroOperacion  ?? null,
    p_observaciones:       observaciones    ?? null,
    p_archivo_comprobante: archivoComprobante ?? null,
  });

  if (rpcErr) {
    console.error('Error en registrar_pago_atomico:', rpcErr.message);
    throw rpcErr;
  }

  // El RPC devuelve un objeto JSON; lo convertimos al tipo PagoV2
  const r = rpcData as Record<string, unknown>;
  return {
    id:                 String(r.id),
    chargeId:           String(r.charge_id),
    empadronadoId:      String(r.empadronado_id),
    periodo:            String(r.periodo),
    monto:              Number(r.monto),
    montoOriginal:      Number(r.monto_original),
    descuentoProntoPago: r.descuento_pronto_pago != null ? Number(r.descuento_pronto_pago) : undefined,
    metodoPago:         r.metodo_pago as PagoV2['metodoPago'],
    numeroOperacion:    (r.numero_operacion as string | undefined) ?? undefined,
    estado:             r.estado as PagoV2['estado'],
    fechaPagoRegistrada: r.fecha_pago_registrada ? dateToEpoch(String(r.fecha_pago_registrada)) : 0,
    fechaCreacion:      r.fecha_creacion ? new Date(String(r.fecha_creacion)).getTime() : Date.now(),
    archivoComprobante: (r.archivo_comprobante as string | undefined) ?? undefined,
    observaciones:      (r.observaciones as string | undefined) ?? undefined,
  };
}

// =============================================================================
// 8. CIERRE MENSUAL (marcar cargos vencidos como morosos)
// =============================================================================

export async function ejecutarCierreMensualV2(): Promise<void> {
  const config  = await obtenerConfiguracionV2();
  const today   = new Date().toISOString().slice(0, 10);

  // Traer cargos vencidos con saldo pendiente que aún no son morosos
  const { data: cargosVencidos, error } = await supabase
    .from('cobranzas_charges')
    .select('id, saldo')
    .lt('fecha_vencimiento', today)
    .gt('saldo', 0)
    .eq('es_moroso', false)
    .neq('estado', 'anulado');

  if (error) {
    console.error('Error en cierre mensual V2:', error.message);
    throw error;
  }

  if (!cargosVencidos?.length) {
    console.log('No hay cargos vencidos para procesar');
    return;
  }

  let procesados = 0;

  for (const charge of cargosVencidos) {
    const montoMorosidad = (Number(charge.saldo) * config.porcentajeMorosidad) / 100;

    const { error: updErr } = await supabase
      .from('cobranzas_charges')
      .update({
        es_moroso:      true,
        monto_morosidad: montoMorosidad,
        estado:         'moroso',
      })
      .eq('id', charge.id);

    if (!updErr) procesados++;
  }

  console.log(`Cierre mensual completado. ${procesados} cargos procesados`);
}

// =============================================================================
// 9. ESTADÍSTICAS
// =============================================================================

export async function generarEstadisticasV2(): Promise<EstadisticasV2> {
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentPeriod = getCurrentPeriod();
  const monthStart   = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const monthEnd     = nextMonthStart(currentYear, currentMonth);
  const today        = now.toISOString().slice(0, 10);

  // Pagos aprobados del mes (recaudación)
  const { data: pagosAprobados } = await supabase
    .from('cobranzas_pagos')
    .select('monto')
    .eq('estado', 'aprobado')
    .gte('fecha_pago_registrada', monthStart)
    .lt('fecha_pago_registrada', monthEnd);

  const recaudadoMes = (pagosAprobados ?? []).reduce((s, p) => s + Number(p.monto), 0);

  // Cargos vencidos no pagados → deuda total y morosos
  const { data: overdueCharges } = await supabase
    .from('cobranzas_charges')
    .select('saldo, empadronado_id')
    .lt('fecha_vencimiento', today)
    .gt('saldo', 0)
    .neq('estado', 'anulado');

  const mesesPorEmp = new Map<string, number>();
  let pendienteTotal = 0;

  for (const c of overdueCharges ?? []) {
    pendienteTotal += Number(c.saldo);
    mesesPorEmp.set(c.empadronado_id as string, (mesesPorEmp.get(c.empadronado_id as string) ?? 0) + 1);
  }

  const morosos = [...mesesPorEmp.values()].filter(n => n >= 2).length;

  // Cargos del período actual
  const { data: chargesMes } = await supabase
    .from('cobranzas_charges')
    .select('saldo, estado')
    .eq('periodo', currentPeriod)
    .neq('estado', 'anulado');

  const cargosMesTotal   = chargesMes?.length ?? 0;
  const cargosMesPagados = (chargesMes ?? []).filter(c => Number(c.saldo) <= 0 || c.estado === 'pagado').length;
  const tasaCobranza     = cargosMesTotal > 0 ? (cargosMesPagados / cargosMesTotal) * 100 : 0;

  // Total empadronados activos
  const empadronados = await getEmpadronados();
  const totalEmpadronados = empadronados.filter(e => e.habilitado).length;

  // Movimientos financieros del mes (ingresos / egresos distintos a cuotas)
  const { data: movimientos } = await supabase
    .from('movimientos_financieros')
    .select('tipo, monto')
    .gte('fecha', monthStart)
    .lt('fecha', monthEnd);

  let ingresosMes = recaudadoMes;
  let egresosMes  = 0;

  for (const m of movimientos ?? []) {
    if (m.tipo === 'ingreso') ingresosMes += Number(m.monto);
    else if (m.tipo === 'egreso') egresosMes += Number(m.monto);
  }

  return {
    recaudadoMes,
    pendienteTotal,
    morosos,
    tasaCobranza,
    ingresosMes,
    egresosMes,
    saldoMes: ingresosMes - egresosMes,
    totalEmpadronados,
    cargosMesPagados,
    cargosMesTotal,
  };
}

// =============================================================================
// 10. INGRESOS Y EGRESOS (movimientos_financieros)
// =============================================================================

export async function crearIngresoV2(ingreso: Omit<IngresoV2, 'id'>): Promise<IngresoV2> {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .insert({
      tipo:                  'ingreso',
      categoria:             ingreso.categoria,
      monto:                 ingreso.monto,
      descripcion:           ingreso.concepto,
      fecha:                 epochToDate(ingreso.fecha),
      numero_comprobante:    ingreso.numeroOperacion ?? null,
      observaciones:         ingreso.observaciones   ?? null,
      comprobantes:          '[]',
      registrado_por:        null,   // caller puede sobrescribir vía RPC si necesita trazabilidad
      registrado_por_nombre: 'Sistema',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando ingreso V2:', error.message);
    throw error;
  }

  return {
    id:              data.id,
    concepto:        data.descripcion,
    monto:           Number(data.monto),
    fecha:           dateToEpoch(data.fecha),
    categoria:       data.categoria,
    metodoPago:      'efectivo',
    numeroOperacion: data.numero_comprobante ?? undefined,
    observaciones:   data.observaciones      ?? undefined,
  };
}

export async function obtenerIngresosV2(): Promise<IngresoV2[]> {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('*')
    .eq('tipo', 'ingreso')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error obteniendo ingresos V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => ({
    id:              r.id,
    concepto:        r.descripcion,
    monto:           Number(r.monto),
    fecha:           dateToEpoch(r.fecha),
    categoria:       r.categoria,
    metodoPago:      'efectivo' as const,
    numeroOperacion: r.numero_comprobante ?? undefined,
    observaciones:   r.observaciones      ?? undefined,
  }));
}

export async function crearEgresoV2(egreso: Omit<EgresoV2, 'id'>): Promise<EgresoV2> {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .insert({
      tipo:                  'egreso',
      categoria:             egreso.categoria,
      monto:                 egreso.monto,
      descripcion:           egreso.concepto,
      fecha:                 epochToDate(egreso.fecha),
      numero_comprobante:    egreso.numeroOperacion ?? null,
      observaciones:         egreso.observaciones   ?? null,
      comprobantes:          '[]',
      registrado_por:        null,
      registrado_por_nombre: 'Sistema',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando egreso V2:', error.message);
    throw error;
  }

  return {
    id:              data.id,
    concepto:        data.descripcion,
    monto:           Number(data.monto),
    fecha:           dateToEpoch(data.fecha),
    categoria:       data.categoria,
    metodoPago:      'efectivo',
    numeroOperacion: data.numero_comprobante ?? undefined,
    observaciones:   data.observaciones      ?? undefined,
  };
}

export async function obtenerEgresosV2(): Promise<EgresoV2[]> {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('*')
    .eq('tipo', 'egreso')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error obteniendo egresos V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => ({
    id:              r.id,
    concepto:        r.descripcion,
    monto:           Number(r.monto),
    fecha:           dateToEpoch(r.fecha),
    categoria:       r.categoria,
    metodoPago:      'efectivo' as const,
    numeroOperacion: r.numero_comprobante ?? undefined,
    observaciones:   r.observaciones      ?? undefined,
  }));
}

// =============================================================================
// 11. LECTURA DE PAGOS Y CHARGES
// =============================================================================

export async function obtenerPagosV2(): Promise<PagoV2[]> {
  const { data, error } = await supabase
    .from('cobranzas_pagos')
    .select('*')
    .order('fecha_pago_registrada', { ascending: false });

  if (error) {
    console.error('Error obteniendo pagos V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => fromPagoRow(r));
}

export async function obtenerPagosPendientesV2(): Promise<PagoV2[]> {
  const { data, error } = await supabase
    .from('cobranzas_pagos')
    .select('*')
    .eq('estado', 'pendiente')
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('Error obteniendo pagos pendientes V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => fromPagoRow(r));
}

export async function obtenerChargesV2(): Promise<ChargeV2[]> {
  const { data, error } = await supabase
    .from('cobranzas_charges')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20000); // Supera el límite default de PostgREST (1000) para cubrir toda la BD

  if (error) {
    console.error('Error obteniendo charges V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => fromChargeRow(r));
}

interface DeudaVencidaRow {
  totalDeuda: number;
  mesesVencidos: number;
}

/**
 * Calcula la deuda VENCIDA de cada empadronado usando un RPC en el servidor.
 * La función SQL hace SUM(saldo) + COUNT(*) GROUP BY empadronado_id
 * directamente en PostgreSQL, devolviendo solo ~456 filas (una por socio),
 * lo cual evita por completo el límite de filas de PostgREST (default 1000).
 *
 * Reglas (ejecutadas en SQL):
 *   - estado = 'moroso'   → siempre cuenta (sin importar la fecha)
 *   - estado = 'pendiente' + fecha_vencimiento < hoy → también cuenta
 *   - saldo > 0
 */
export async function obtenerDeudaVencidaMap(): Promise<Map<string, DeudaVencidaRow>> {
  const { data, error } = await supabase.rpc('calcular_deuda_vencida_map');

  if (error) {
    console.error('Error obteniendo mapa de deuda vencida (RPC):', error.message);
    return new Map();
  }

  const map = new Map<string, DeudaVencidaRow>();
  for (const row of data ?? []) {
    map.set(String(row.empadronado_id), {
      totalDeuda:    Number(row.total_deuda),
      mesesVencidos: Number(row.meses_vencidos),
    });
  }
  return map;
}

export async function obtenerChargesPorEmpadronadoV2(empadronadoId: string): Promise<ChargeV2[]> {
  const { data, error } = await supabase
    .from('cobranzas_charges')
    .select('*')
    .eq('empadronado_id', empadronadoId)
    .order('periodo', { ascending: false });

  if (error) {
    console.error('Error obteniendo charges por empadronado V2:', error.message);
    return [];
  }

  return (data ?? []).map(r => fromChargeRow(r));
}

// =============================================================================
// 12. APROBAR / RECHAZAR PAGOS
// =============================================================================

export async function aprobarPagoV2(
  pagoId: string,
  comentario?: string,
  aprobadoPor?: string,
  aprobadoPorNombre?: string
): Promise<void> {
  // Obtener el pago
  const { data: pagoRow, error: pagoErr } = await supabase
    .from('cobranzas_pagos')
    .select('*')
    .eq('id', pagoId)
    .maybeSingle();

  if (pagoErr) throw pagoErr;
  if (!pagoRow) throw new Error('Pago no encontrado');

  const pago = fromPagoRow(pagoRow);
  if (pago.estado !== 'pendiente') throw new Error('Solo se pueden aprobar pagos pendientes');

  // Actualizar pago → aprobado
  const { error: updPagoErr } = await supabase
    .from('cobranzas_pagos')
    .update({
      estado:               'aprobado',
      fecha_aprobacion:     new Date().toISOString(),
      aprobado_por:         isUUID(aprobadoPor) ? aprobadoPor : null,
      aprobado_por_nombre:  aprobadoPorNombre ?? null,
      comentario_aprobacion: comentario ?? null,
    })
    .eq('id', pagoId);

  if (updPagoErr) throw updPagoErr;

  // Actualizar cargo vinculado
  const { data: chargeRow, error: chargeErr } = await supabase
    .from('cobranzas_charges')
    .select('*')
    .eq('id', pago.chargeId)
    .maybeSingle();

  let empadronadoNombre = pago.empadronadoId;

  if (chargeRow && !chargeErr) {
    const nuevoSaldo      = Math.max(0, Number(chargeRow.saldo) - pago.monto);
    const nuevoMontoPagado = Number(chargeRow.monto_pagado) + pago.monto;

    await supabase
      .from('cobranzas_charges')
      .update({
        monto_pagado: nuevoMontoPagado,
        saldo:        nuevoSaldo,
        estado:       nuevoSaldo === 0 ? 'pagado' : 'pendiente',
      })
      .eq('id', chargeRow.id);

    // Obtener nombre del empadronado para el movimiento financiero
    try {
      const empadronados = await getEmpadronados();
      const emp = empadronados.find(e => e.id === pago.empadronadoId);
      if (emp) empadronadoNombre = `${emp.nombre} ${emp.apellidos}`;
    } catch { /* ignorar — solo para la descripción */ }
  }

  // Registrar en movimientos financieros (si hay usuario válido)
  if (isUUID(aprobadoPor)) {
    const periodoFormateado = `${pago.periodo.slice(4)}/${pago.periodo.slice(0, 4)}`;
    await supabase
      .from('movimientos_financieros')
      .insert({
        tipo:                  'ingreso',
        categoria:             'cuotas',
        monto:                 pago.monto,
        descripcion:           `Pago cuota mensual - Período ${periodoFormateado} - ${empadronadoNombre}`,
        fecha:                 epochToDate(pago.fechaPagoRegistrada),
        comprobantes:          '[]',
        registrado_por:        aprobadoPor,
        registrado_por_nombre: aprobadoPorNombre ?? 'Sistema',
        observaciones:         `Aprobación de pago ID: ${pagoId}${comentario ? ` - ${comentario}` : ''}`,
      })
      .then(({ error }) => {
        if (error) console.error('❌ Error registrando movimiento financiero:', error.message);
        else       console.log('💰 Movimiento financiero registrado para pago:', pagoId);
      });
  }

  console.log('✅ Pago aprobado:', pagoId);
}

export async function aprobarPagosMasivosImportacion(
  onProgreso?: (procesados: number, total: number) => void
): Promise<{ aprobados: number; errores: number }> {
  const pagosPendientes = await obtenerPagosPendientesV2();
  const pagosImportacion = pagosPendientes.filter(
    p => p.metodoPago === 'importacion_masiva' || p.numeroOperacion?.startsWith('IMPORT-')
  );

  let aprobados = 0;
  let errores   = 0;

  for (let i = 0; i < pagosImportacion.length; i++) {
    try {
      await aprobarPagoV2(
        pagosImportacion[i].id,
        'Aprobación masiva de pagos importados',
        undefined,
        'Sistema - Importación Masiva'
      );
      aprobados++;
    } catch (error) {
      console.error(`Error aprobando pago ${pagosImportacion[i].id}:`, error);
      errores++;
    }

    onProgreso?.(i + 1, pagosImportacion.length);

    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { aprobados, errores };
}

export async function rechazarPagoV2(pagoId: string, motivoRechazo: string): Promise<void> {
  if (!motivoRechazo?.trim()) throw new Error('Debes proporcionar un motivo de rechazo');

  const { data: pagoRow, error: fetchErr } = await supabase
    .from('cobranzas_pagos')
    .select('estado')
    .eq('id', pagoId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!pagoRow) throw new Error('Pago no encontrado');
  if (pagoRow.estado !== 'pendiente') throw new Error('Solo se pueden rechazar pagos pendientes');

  const { error } = await supabase
    .from('cobranzas_pagos')
    .update({
      estado:        'rechazado',
      motivo_rechazo: motivoRechazo.trim(),
      fecha_rechazo:  new Date().toISOString(),
    })
    .eq('id', pagoId);

  if (error) throw error;
  console.log('❌ Pago rechazado:', pagoId);
}

// =============================================================================
// 13. EDITAR / ELIMINAR PAGO
// =============================================================================

export async function actualizarPagoV2(
  pagoId: string,
  datosActualizados: Partial<PagoV2>
): Promise<void> {
  const { data: pagoRow, error: fetchErr } = await supabase
    .from('cobranzas_pagos')
    .select('*')
    .eq('id', pagoId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!pagoRow) throw new Error('Pago no encontrado');

  const pagoActual = fromPagoRow(pagoRow);

  // Si el pago aprobado cambia de monto → actualizar el cargo
  if (
    pagoActual.estado === 'aprobado' &&
    datosActualizados.monto != null &&
    datosActualizados.monto !== pagoActual.monto
  ) {
    const { data: chargeRow } = await supabase
      .from('cobranzas_charges')
      .select('*')
      .eq('id', pagoActual.chargeId)
      .maybeSingle();

    if (chargeRow) {
      const delta       = datosActualizados.monto - pagoActual.monto;
      const nuevoSaldo  = Math.max(0, Number(chargeRow.saldo) - delta);
      const nuevoEstado = nuevoSaldo === 0
        ? 'pagado'
        : (new Date().toISOString().slice(0, 10) > chargeRow.fecha_vencimiento ? 'moroso' : 'pendiente');

      await supabase
        .from('cobranzas_charges')
        .update({
          monto_pagado: Number(chargeRow.monto_pagado) + delta,
          saldo:        nuevoSaldo,
          estado:       nuevoEstado,
          es_moroso:    nuevoEstado === 'moroso',
        })
        .eq('id', chargeRow.id);
    }
  }

  // Construir objeto de actualización (snake_case)
  const updates: Record<string, unknown> = { fecha_modificacion: new Date().toISOString() };
  if (datosActualizados.monto             != null) updates.monto               = datosActualizados.monto;
  if (datosActualizados.montoOriginal     != null) updates.monto_original      = datosActualizados.montoOriginal;
  if (datosActualizados.metodoPago        != null) updates.metodo_pago         = datosActualizados.metodoPago;
  if (datosActualizados.numeroOperacion   != null) updates.numero_operacion    = datosActualizados.numeroOperacion;
  if (datosActualizados.observaciones     != null) updates.observaciones       = datosActualizados.observaciones;
  if (datosActualizados.archivoComprobante != null) updates.archivo_comprobante = datosActualizados.archivoComprobante;
  if (datosActualizados.estado            != null) updates.estado              = datosActualizados.estado;

  const { error } = await supabase
    .from('cobranzas_pagos')
    .update(updates)
    .eq('id', pagoId);

  if (error) throw error;
  console.log('✏️ Pago actualizado:', pagoId);
}

export async function eliminarPagoV2(pagoId: string): Promise<void> {
  const { data: pagoRow, error: fetchErr } = await supabase
    .from('cobranzas_pagos')
    .select('*')
    .eq('id', pagoId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!pagoRow) throw new Error('Pago no encontrado');

  const pago = fromPagoRow(pagoRow);

  // Si el pago estaba aprobado → revertir el cargo
  if (pago.estado === 'aprobado') {
    const { data: chargeRow } = await supabase
      .from('cobranzas_charges')
      .select('*')
      .eq('id', pago.chargeId)
      .maybeSingle();

    if (chargeRow) {
      const nuevoSaldo  = Number(chargeRow.saldo) + pago.monto;
      const nuevoEstado = nuevoSaldo > 0
        ? (new Date().toISOString().slice(0, 10) > chargeRow.fecha_vencimiento ? 'moroso' : 'pendiente')
        : 'pagado';

      await supabase
        .from('cobranzas_charges')
        .update({
          monto_pagado: Math.max(0, Number(chargeRow.monto_pagado) - pago.monto),
          saldo:        nuevoSaldo,
          estado:       nuevoEstado,
          es_moroso:    nuevoEstado === 'moroso',
        })
        .eq('id', chargeRow.id);
    }
  }

  const { error } = await supabase
    .from('cobranzas_pagos')
    .delete()
    .eq('id', pagoId);

  if (error) throw error;
  console.log('🗑️ Pago eliminado:', pagoId);
}

// =============================================================================
// 14. REPORTES
// =============================================================================

export async function obtenerReporteDeudores(): Promise<{
  empadronadoId: string;
  nombre: string;
  apellidos: string;
  numeroPadron: string;
  deudaTotal: number;
  periodosVencidos: string[];
  esMoroso: boolean;
}[]> {
  const today = new Date().toISOString().slice(0, 10);

  // Traer charges vencidos con saldo + datos del empadronado (JOIN)
  const { data, error } = await supabase
    .from('cobranzas_charges')
    .select(`
      id, empadronado_id, saldo, periodo, es_moroso, fecha_vencimiento,
      empadronados!inner ( nombre, apellidos, numero_padron, habilitado )
    `)
    .lt('fecha_vencimiento', today)
    .gt('saldo', 0)
    .neq('estado', 'anulado');  // no usar anulado=false (NULL != false en PostgreSQL)

  if (error) {
    console.error('Error obteniendo reporte de deudores V2:', error.message);
    return [];
  }

  // Agrupar por empadronado
  const mapa = new Map<string, {
    nombre: string;
    apellidos: string;
    numeroPadron: string;
    deudaTotal: number;
    periodosVencidos: string[];
    esMoroso: boolean;
  }>();

  for (const row of data ?? []) {
    const emp = (row as any).empadronados;
    if (!emp?.habilitado) continue;

    const empId = row.empadronado_id as string;
    const entry = mapa.get(empId) ?? {
      nombre:          emp.nombre,
      apellidos:       emp.apellidos,
      numeroPadron:    emp.numero_padron,
      deudaTotal:      0,
      periodosVencidos: [],
      esMoroso:        false,
    };

    entry.deudaTotal += Number(row.saldo);
    entry.periodosVencidos.push(row.periodo as string);
    if (row.es_moroso) entry.esMoroso = true;

    mapa.set(empId, entry);
  }

  return [...mapa.entries()]
    .map(([empadronadoId, v]) => ({ empadronadoId, ...v }))
    .sort((a, b) => b.deudaTotal - a.deudaTotal);
}

export async function obtenerEstadoCuentaEmpadronado(empadronadoId: string): Promise<{
  empadronado: unknown;
  charges: ChargeV2[];
  pagos: PagoV2[];
  deudaTotal: number;
  ultimoPago?: PagoV2;
}> {
  const empadronados = await getEmpadronados();
  const empadronado  = empadronados.find(e => e.id === empadronadoId);
  if (!empadronado) throw new Error('Empadronado no encontrado');

  const [chargesResult, pagosResult] = await Promise.all([
    supabase
      .from('cobranzas_charges')
      .select('*')
      .eq('empadronado_id', empadronadoId)
      .order('periodo', { ascending: false }),
    supabase
      .from('cobranzas_pagos')
      .select('*')
      .eq('empadronado_id', empadronadoId)
      .order('fecha_pago_registrada', { ascending: false }),
  ]);

  if (chargesResult.error) throw chargesResult.error;
  if (pagosResult.error)   throw pagosResult.error;

  const charges   = (chargesResult.data ?? []).map(r => fromChargeRow(r));
  const pagos     = (pagosResult.data   ?? []).map(r => fromPagoRow(r));
  const deudaTotal = charges.reduce((s, c) => s + c.saldo, 0);

  return { empadronado, charges, pagos, deudaTotal, ultimoPago: pagos[0] };
}

// =============================================================================
// 15. ANULAR CHARGES
// =============================================================================

export async function anularChargeV2(
  chargeId: string,
  motivoAnulacion: string,
  anuladoPor: string,
  anuladoPorNombre: string
): Promise<void> {
  const { error } = await supabase
    .from('cobranzas_charges')
    .update({
      anulado:          true,
      estado:           'anulado',
      saldo:            0,
      fecha_anulacion:  new Date().toISOString(),
      anulado_por:      isUUID(anuladoPor) ? anuladoPor : null,
      anulado_por_nombre: anuladoPorNombre,
      motivo_anulacion: motivoAnulacion,
    })
    .eq('id', chargeId);

  if (error) {
    console.error('Error anulando cargo:', error.message);
    throw error;
  }

  console.log(`✅ Cargo ${chargeId} anulado correctamente`);
}

export async function anularMultiplesChargesV2(
  chargeIds: string[],
  motivoAnulacion: string,
  anuladoPor: string,
  anuladoPorNombre: string
): Promise<{ exitosos: number; fallidos: number }> {
  let exitosos = 0;
  let fallidos = 0;

  for (const chargeId of chargeIds) {
    try {
      await anularChargeV2(chargeId, motivoAnulacion, anuladoPor, anuladoPorNombre);
      exitosos++;
    } catch (error) {
      console.error(`Error anulando cargo ${chargeId}:`, error);
      fallidos++;
    }
  }

  return { exitosos, fallidos };
}
