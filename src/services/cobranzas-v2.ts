import { ref, push, set, get, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";
import { 
  ConfiguracionCobranzasV2, 
  ChargeV2, 
  PagoV2, 
  IngresoV2, 
  EgresoV2, 
  EstadisticasV2,
  PeriodLock,
  PagoIndex
} from "@/types/cobranzas-v2";
import { getEmpadronados } from "@/services/empadronados";
import { crearMovimientoFinanciero } from "@/services/finanzas";

const BASE_PATH = "cobranzas_v2";

// Configuración por defecto
const DEFAULT_CONFIG: ConfiguracionCobranzasV2 = {
  montoMensual: 50,
  diaCierre: 14,
  diaVencimiento: 15,
  diasProntoPago: 3,
  porcentajeProntoPago: 5,
  porcentajeMorosidad: 10,
  serieComprobantes: "001",
  numeroComprobanteActual: 1,
  sede: "JPUSAP"
};

// === CONFIGURACIÓN ===
export async function obtenerConfiguracionV2(): Promise<ConfiguracionCobranzasV2> {
  try {
    const configRef = ref(db, `${BASE_PATH}/configuracion`);
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      return { ...DEFAULT_CONFIG, ...snapshot.val() };
    }
    
    // Si no existe, crear configuración por defecto
    await set(configRef, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error obteniendo configuración V2:", error);
    return DEFAULT_CONFIG;
  }
}

export async function actualizarConfiguracionV2(config: Partial<ConfiguracionCobranzasV2>): Promise<void> {
  try {
    const configRef = ref(db, `${BASE_PATH}/configuracion`);
    await update(configRef, config);
  } catch (error) {
    console.error("Error actualizando configuración V2:", error);
    throw error;
  }
}

// === UTILIDADES DE FECHA ===
function formatPeriod(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentPeriod(): string {
  return formatPeriod(new Date());
}

function calculateChargeDate(empadronado: any, config: ConfiguracionCobranzasV2): Date {
  // =====================================================
  // POLÍTICA TEMPORAL (Diciembre 2024):
  // TODOS los empadronados habilitados cobran desde 01/01/2025
  // Ignoramos la fecha de ingreso porque no es confiable.
  // 
  // FUTURO: Los empadronados confirmarán su fecha real de ingreso
  // al entrar a su portal, y la secretaría validará.
  // =====================================================
  
  // Fecha base fija: 01 de Enero 2025
  const FECHA_BASE_COBRO = new Date(2025, 0, 1); // 01/01/2025
  
  return FECHA_BASE_COBRO;
}

function calculateDueDate(chargeDate: Date, config: ConfiguracionCobranzasV2): Date {
  // Vencimiento: día 15 del MISMO MES del cargo
  // Ej: Cargo de diciembre 2025 → vence el 15 de diciembre 2025
  return new Date(chargeDate.getFullYear(), chargeDate.getMonth(), config.diaVencimiento);
}

// === LOCKS Y ANTI-DUPLICADOS ===
async function isPeriodGenerated(period: string): Promise<boolean> {
  try {
    const lockRef = ref(db, `${BASE_PATH}/periods/${period}/generated`);
    const snapshot = await get(lockRef);
    return snapshot.exists() && snapshot.val() === true;
  } catch (error) {
    console.error("Error verificando período generado:", error);
    return false;
  }
}

async function markPeriodGenerated(period: string, generadoPor: string): Promise<void> {
  try {
    const lockRef = ref(db, `${BASE_PATH}/periods/${period}`);
    await set(lockRef, {
      generated: true,
      fechaGeneracion: Date.now(),
      generadoPor
    });
  } catch (error) {
    console.error("Error marcando período como generado:", error);
    throw error;
  }
}

async function existsPagoForPeriod(empadronadoId: string, period: string): Promise<boolean> {
  try {
    const indexRef = ref(db, `${BASE_PATH}/pagos_index/${empadronadoId}/${period}`);
    const snapshot = await get(indexRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error verificando pago existente:", error);
    return false;
  }
}

// === GENERACIÓN DE CARGOS ===
export async function generarCargoMensual(empadronadoId: string, period: string, config: ConfiguracionCobranzasV2): Promise<ChargeV2 | null> {
  try {
    // Verificar si ya existe cargo para este período
    const chargesRef = ref(db, `${BASE_PATH}/charges/${period}/${empadronadoId}`);
    const existingSnapshot = await get(chargesRef);
    
    if (existingSnapshot.exists()) {
      return null; // Ya existe
    }

    const empadronados = await getEmpadronados();
    const empadronado = empadronados.find(e => e.id === empadronadoId);
    
    if (!empadronado || !empadronado.habilitado) {
      return null; // No encontrado o no habilitado
    }

    const chargeStartDate = calculateChargeDate(empadronado, config);
    const periodDate = new Date(parseInt(period.substring(0, 4)), parseInt(period.substring(4)) - 1, 1);
    
    // Solo generar si el período es >= fecha de inicio de cobro
    if (periodDate < chargeStartDate) {
      return null; // Período anterior a fecha de inicio
    }

    const dueDate = calculateDueDate(periodDate, config);
    
    const charge: ChargeV2 = {
      id: `${period}_${empadronadoId}`,
      empadronadoId,
      periodo: period,
      montoOriginal: config.montoMensual,
      montoPagado: 0,
      saldo: config.montoMensual,
      fechaVencimiento: dueDate.getTime(),
      fechaCreacion: Date.now(),
      estado: 'pendiente',
      esMoroso: false
    };

    const chargeRef = push(chargesRef);
    charge.id = chargeRef.key!;
    await set(chargeRef, charge);
    
    return charge;
  } catch (error) {
    console.error("Error generando cargo mensual:", error);
    throw error;
  }
}

export async function generarMesActual(generadoPor: string): Promise<void> {
  try {
    const config = await obtenerConfiguracionV2();
    const currentPeriod = getCurrentPeriod();
    
    const empadronados = await getEmpadronados();
    const empadronadosActivos = empadronados.filter(e => e.habilitado);

    console.log(`Generando mes actual ${currentPeriod} para ${empadronadosActivos.length} empadronados`);

    let cargosGenerados = 0;
    
    // Generar cargos para todos los empadronados activos
    for (const emp of empadronadosActivos) {
      const result = await generarCargoMensual(emp.id, currentPeriod, config);
      if (result) cargosGenerados++;
    }
    
    // Marcar período como generado si no lo está
    if (!(await isPeriodGenerated(currentPeriod))) {
      await markPeriodGenerated(currentPeriod, generadoPor);
    }
    
    if (cargosGenerados === 0) {
      console.log(`El período ${currentPeriod} ya estaba completamente generado`);
    } else {
      console.log(`Generación completada para período ${currentPeriod}. ${cargosGenerados} cargos nuevos.`);
    }
  } catch (error) {
    console.error("Error en generarMesActual:", error);
    throw error;
  }
}

// === CORRECCIÓN DE FECHAS DE VENCIMIENTO ===
// Corrige todos los cargos existentes para que venzan el día 15 del MISMO mes
export async function corregirFechasVencimiento(): Promise<number> {
  try {
    const config = await obtenerConfiguracionV2();
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    
    if (!chargesSnapshot.exists()) {
      return 0;
    }

    const allCharges = chargesSnapshot.val();
    const updates: { [path: string]: any } = {};
    let corregidos = 0;

    for (const period in allCharges) {
      // Extraer año y mes del período (YYYYMM)
      const año = parseInt(period.substring(0, 4));
      const mes = parseInt(period.substring(4, 6)) - 1; // 0-indexed
      
      // Fecha de vencimiento correcta: día 15 del MISMO mes
      const fechaVencimientoCorrecta = new Date(año, mes, config.diaVencimiento).getTime();
      
      for (const empId in allCharges[period]) {
        for (const chargeId in allCharges[period][empId]) {
          const charge = allCharges[period][empId][chargeId];
          
          // Si la fecha es diferente, corregir
          if (charge.fechaVencimiento !== fechaVencimientoCorrecta) {
            const chargePath = `${BASE_PATH}/charges/${period}/${empId}/${chargeId}/fechaVencimiento`;
            updates[chargePath] = fechaVencimientoCorrecta;
            corregidos++;
          }
        }
      }
    }

    // Aplicar todas las correcciones
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
      console.log(`✅ Corregidas ${corregidos} fechas de vencimiento`);
    }

    return corregidos;
  } catch (error) {
    console.error("Error corrigiendo fechas:", error);
    return 0;
  }
}

// === GENERACIÓN AUTOMÁTICA ===
// Ejecuta en segundo plano, no bloquea la UI
export async function verificarYGenerarCargosAutomaticos(): Promise<{ 
  cargosGenerados: number; 
  cierreEjecutado: boolean;
  mensaje: string;
}> {
  try {
    // Verificar si ya se corrigieron las fechas (una sola vez)
    const correccionRef = ref(db, `${BASE_PATH}/config/fechasCorregidas`);
    const correccionSnapshot = await get(correccionRef);
    
    if (!correccionSnapshot.exists() || !correccionSnapshot.val()) {
      // Corregir todas las fechas de vencimiento existentes
      const corregidos = await corregirFechasVencimiento();
      if (corregidos > 0) {
        console.log(`✅ Se corrigieron ${corregidos} fechas de vencimiento`);
      }
      // Marcar como corregido
      await set(correccionRef, true);
    }
    
    // =====================================================
    // GENERAR TODOS LOS CARGOS DESDE ENERO 2025 (una sola vez)
    // =====================================================
    const backfillRef = ref(db, `${BASE_PATH}/config/backfillEnero2025Completado`);
    const backfillSnapshot = await get(backfillRef);
    
    let cargosGenerados = 0;
    
    if (!backfillSnapshot.exists() || !backfillSnapshot.val()) {
      console.log('🔄 Iniciando backfill de cargos desde Enero 2025...');
      
      const [config, empadronados] = await Promise.all([
        obtenerConfiguracionV2(),
        getEmpadronados()
      ]);
      const empadronadosActivos = empadronados.filter(e => e.habilitado);
      
      // Generar todos los períodos desde Enero 2025 hasta el mes actual
      const currentDate = new Date();
      const periods: string[] = [];
      const tempDate = new Date(2025, 0, 1); // Enero 2025
      
      while (tempDate <= currentDate) {
        periods.push(formatPeriod(tempDate));
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      
      console.log(`📅 Períodos a generar: ${periods.join(', ')}`);
      console.log(`👥 Empadronados activos: ${empadronadosActivos.length}`);
      
      // Generar cargos para cada período y empadronado
      for (const period of periods) {
        const batchSize = 50;
        for (let i = 0; i < empadronadosActivos.length; i += batchSize) {
          const batch = empadronadosActivos.slice(i, i + batchSize);
          const promises = batch.map(emp => 
            generarCargoMensualOptimizado(emp, period, config)
          );
          const results = await Promise.all(promises);
          cargosGenerados += results.filter(r => r !== null).length;
        }
      }
      
      // Marcar backfill como completado
      await set(backfillRef, true);
      console.log(`✅ Backfill completado. ${cargosGenerados} cargos nuevos generados.`);
    } else {
      // Solo generar el mes actual si no existe
      const currentDate = new Date();
      const currentPeriod = formatPeriod(currentDate);
      const isGenerated = await isPeriodGenerated(currentPeriod);
      
      if (!isGenerated) {
        const [config, empadronados] = await Promise.all([
          obtenerConfiguracionV2(),
          getEmpadronados()
        ]);
        const empadronadosActivos = empadronados.filter(e => e.habilitado);
        
        const batchSize = 50;
        for (let i = 0; i < empadronadosActivos.length; i += batchSize) {
          const batch = empadronadosActivos.slice(i, i + batchSize);
          const promises = batch.map(emp => 
            generarCargoMensualOptimizado(emp, currentPeriod, config)
          );
          const results = await Promise.all(promises);
          cargosGenerados += results.filter(r => r !== null).length;
        }
        
        await markPeriodGenerated(currentPeriod, 'sistema_automatico');
      }
    }
    
    let mensaje = '';
    if (cargosGenerados > 0) {
      const currentPeriodForMessage = formatPeriod(new Date());
      mensaje = `${cargosGenerados} cargos generados para ${currentPeriodForMessage}`;
    }
    
    return { cargosGenerados, cierreEjecutado: false, mensaje };
  } catch (error) {
    console.error("Error en verificación automática:", error);
    return { cargosGenerados: 0, cierreEjecutado: false, mensaje: '' };
  }
}

// Versión optimizada que recibe el empadronado directamente
async function generarCargoMensualOptimizado(
  empadronado: any, 
  period: string, 
  config: ConfiguracionCobranzasV2
): Promise<ChargeV2 | null> {
  try {
    const chargesRef = ref(db, `${BASE_PATH}/charges/${period}/${empadronado.id}`);
    const existingSnapshot = await get(chargesRef);
    
    if (existingSnapshot.exists()) {
      return null;
    }

    const chargeStartDate = calculateChargeDate(empadronado, config);
    const periodDate = new Date(parseInt(period.substring(0, 4)), parseInt(period.substring(4)) - 1, 1);
    
    if (periodDate < chargeStartDate) {
      return null;
    }

    const dueDate = calculateDueDate(periodDate, config);
    
    const charge: ChargeV2 = {
      id: `${period}_${empadronado.id}`,
      empadronadoId: empadronado.id,
      periodo: period,
      montoOriginal: config.montoMensual,
      montoPagado: 0,
      saldo: config.montoMensual,
      fechaVencimiento: dueDate.getTime(),
      fechaCreacion: Date.now(),
      estado: 'pendiente',
      esMoroso: false
    };

    const chargeRef = push(chargesRef);
    charge.id = chargeRef.key!;
    await set(chargeRef, charge);
    
    return charge;
  } catch (error) {
    return null;
  }
}

export async function generarDesdeEnero2025(generadoPor: string): Promise<void> {
  try {
    const config = await obtenerConfiguracionV2();
    const empadronados = await getEmpadronados();
    const empadronadosActivos = empadronados.filter(e => e.habilitado);

    console.log(`Iniciando backfill desde enero 2025 para ${empadronadosActivos.length} empadronados`);

    const currentDate = new Date();
    const startDate = new Date(2025, 0, 1); // enero 2025
    
    // Generar todos los períodos desde enero 2025 hasta el MES ACTUAL (inclusive)
    const periods: string[] = [];
    const tempDate = new Date(startDate);
    
    // Incluir el mes actual completo
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    while (tempDate <= endDate) {
      periods.push(formatPeriod(tempDate));
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    console.log(`Períodos a generar: ${periods.join(', ')}`);

    let cargosGenerados = 0;
    
    // Generar cargos para cada período y empadronado
    for (const period of periods) {
      console.log(`Procesando período ${period}...`);
      
      for (const emp of empadronadosActivos) {
        const result = await generarCargoMensual(emp.id, period, config);
        if (result) cargosGenerados++;
      }
      
      // Marcar período como generado si no lo está
      if (!(await isPeriodGenerated(period))) {
        await markPeriodGenerated(period, generadoPor);
      }
    }
    
    console.log(`Backfill completado. ${cargosGenerados} cargos nuevos generados.`);
  } catch (error) {
    console.error("Error en generarDesdeEnero2025:", error);
    throw error;
  }
}

// === PAGOS ===
export async function registrarPagoV2(
  chargeId: string,
  monto: number,
  metodoPago: string,
  fechaPagoRegistrada: number,
  archivoComprobante?: string,
  numeroOperacion?: string,
  observaciones?: string
): Promise<PagoV2> {
  try {
    const config = await obtenerConfiguracionV2();
    
    // Obtener el cargo
    const chargeSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    let charge: ChargeV2 | null = null;
    let chargePath = '';
    
    // Buscar el cargo en todos los períodos
    if (chargeSnapshot.exists()) {
      const allCharges = chargeSnapshot.val();
      for (const period in allCharges) {
        for (const empId in allCharges[period]) {
          for (const cId in allCharges[period][empId]) {
            if (cId === chargeId) {
              charge = allCharges[period][empId][cId];
              chargePath = `${BASE_PATH}/charges/${period}/${empId}/${cId}`;
              break;
            }
          }
        }
      }
    }
    
    if (!charge) {
      throw new Error("Cargo no encontrado");
    }

    if (charge.saldo <= 0) {
      throw new Error("El cargo ya está pagado");
    }

    // Permitir pagos adicionales (abonos) siempre que el cargo tenga saldo pendiente
    // La validación de saldo > 0 ya se hizo arriba, así que permitimos registrar el abono

    // Calcular descuento por pronto pago si aplica
    let descuentoProntoPago = 0;
    if (config.diasProntoPago > 0) {
      const periodStart = new Date(parseInt(charge.periodo.substring(0, 4)), parseInt(charge.periodo.substring(4)) - 1, 1);
      const diasDesdePeriodo = Math.floor((Date.now() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasDesdePeriodo <= config.diasProntoPago) {
        descuentoProntoPago = (charge.montoOriginal * config.porcentajeProntoPago) / 100;
      }
    }

    const montoFinal = Math.max(0, monto - descuentoProntoPago);

    // Crear el pago (en estado pendiente de aprobación)
    // IMPORTANTE: Firebase RTDB no acepta undefined, solo incluir propiedades con valores
    const pagoRef = push(ref(db, `${BASE_PATH}/pagos`));
    const pago: any = {
      id: pagoRef.key!,
      chargeId: charge.id,
      empadronadoId: charge.empadronadoId,
      periodo: charge.periodo,
      monto: montoFinal,
      montoOriginal: monto,
      metodoPago: metodoPago as any,
      fechaPagoRegistrada,
      fechaCreacion: Date.now(),
      estado: 'pendiente'
    };

    // Solo agregar propiedades opcionales si tienen valores
    if (descuentoProntoPago > 0) {
      pago.descuentoProntoPago = descuentoProntoPago;
    }
    if (numeroOperacion) {
      pago.numeroOperacion = numeroOperacion;
    }
    if (observaciones) {
      pago.observaciones = observaciones;
    }
    if (archivoComprobante) {
      pago.archivoComprobante = archivoComprobante;
    }

    await set(pagoRef, pago);

    // NO actualizar el cargo aún, esperamos la aprobación
    // El cargo se actualizará cuando se apruebe el pago
    // Nota: No creamos índice anti-duplicados para permitir abonos parciales

    return pago;
  } catch (error) {
    console.error("Error registrando pago V2:", error);
    throw error;
  }
}

// === CIERRE MENSUAL ===
export async function ejecutarCierreMensualV2(): Promise<void> {
  try {
    const config = await obtenerConfiguracionV2();
    const currentTime = Date.now();
    
    // Obtener todos los cargos
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    if (!chargesSnapshot.exists()) {
      console.log("No hay cargos para procesar");
      return;
    }

    const allCharges = chargesSnapshot.val();
    let procesados = 0;

    // Procesar cada cargo vencido y no pagado
    for (const period in allCharges) {
      for (const empId in allCharges[period]) {
        for (const chargeId in allCharges[period][empId]) {
          const charge: ChargeV2 = allCharges[period][empId][chargeId];
          
          // Solo procesar cargos vencidos con saldo pendiente
          if (charge.saldo > 0 && currentTime > charge.fechaVencimiento && !charge.esMoroso) {
            const montoMorosidad = (charge.saldo * config.porcentajeMorosidad) / 100;
            
            const updates = {
              esMoroso: true,
              montoMorosidad,
              estado: 'moroso'
            };
            
            const chargePath = `${BASE_PATH}/charges/${period}/${empId}/${chargeId}`;
            await update(ref(db, chargePath), updates);
            procesados++;
          }
        }
      }
    }

    console.log(`Cierre mensual completado. ${procesados} cargos procesados`);
  } catch (error) {
    console.error("Error en cierre mensual V2:", error);
    throw error;
  }
}

// === ESTADÍSTICAS ===
export async function generarEstadisticasV2(): Promise<EstadisticasV2> {
  try {
    const currentPeriod = getCurrentPeriod();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const ahora = Date.now();

    // Inicializar estadísticas
    let recaudadoMes = 0;
    let pendienteTotal = 0;
    let morosCount = 0;
    let totalEmpadronados = 0;
    let cargosMesPagados = 0;
    let cargosMesTotal = 0;

    // Obtener empadronados activos
    const empadronados = await getEmpadronados();
    const empadronadosActivos = empadronados.filter(e => e.habilitado);
    totalEmpadronados = empadronadosActivos.length;

    // Cargar todos los pagos primero para verificar cobertura
    const pagosSnapshot = await get(ref(db, `${BASE_PATH}/pagos`));
    const allPagos: Record<string, PagoV2> = pagosSnapshot.exists() ? pagosSnapshot.val() : {};
    
    // Crear mapa de pagos por chargeId
    const pagosPorCharge: Record<string, number> = {};
    for (const pagoId in allPagos) {
      const pago = allPagos[pagoId];
      if (pago.estado === 'aprobado' || pago.estado === 'pendiente') {
        if (!pagosPorCharge[pago.chargeId]) {
          pagosPorCharge[pago.chargeId] = 0;
        }
        pagosPorCharge[pago.chargeId] += pago.monto;
      }
      
      // Contar recaudado del mes (pagos aprobados)
      if (pago.estado === 'aprobado') {
        const pagoDate = new Date(pago.fechaPagoRegistrada);
        if (pagoDate.getMonth() + 1 === currentMonth && pagoDate.getFullYear() === currentYear) {
          recaudadoMes += pago.monto;
        }
      }
    }

    // Obtener todos los cargos
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    const mesesVencidosPorEmp: Record<string, number> = {};

    if (chargesSnapshot.exists()) {
      const allCharges = chargesSnapshot.val();
      
      for (const period in allCharges) {
        for (const empId in allCharges[period]) {
          for (const chargeId in allCharges[period][empId]) {
            const charge: ChargeV2 = allCharges[period][empId][chargeId];
            const totalPagado = pagosPorCharge[charge.id] || 0;
            const estaCubierto = totalPagado >= charge.montoOriginal || charge.saldo <= 0;
            const estaVencido = ahora > charge.fechaVencimiento;
            
            // Pendiente = solo cargos VENCIDOS no cubiertos
            if (estaVencido && !estaCubierto) {
              const saldoReal = Math.max(0, charge.montoOriginal - totalPagado);
              pendienteTotal += saldoReal;
              
              // Contar meses vencidos por empadronado
              if (!mesesVencidosPorEmp[empId]) {
                mesesVencidosPorEmp[empId] = 0;
              }
              mesesVencidosPorEmp[empId]++;
            }
            
            // Cargos del mes actual
            if (period === currentPeriod) {
              cargosMesTotal++;
              if (estaCubierto) {
                cargosMesPagados++;
              }
            }
          }
        }
      }
    }

    // Conteo por categorías:
    // - Al día = 0 meses
    // - Atrasado = 1 mes (no se cuenta en morosos)
    // - Moroso = 2 meses
    // - Deudor = 3+ meses
    // Para el KPI "Morosos" contamos los que tienen 2+ meses
    morosCount = Object.values(mesesVencidosPorEmp).filter(meses => meses >= 2).length;

    // Obtener ingresos del mes
    let ingresosMes = recaudadoMes; // Los pagos ya están incluidos
    const ingresosSnapshot = await get(ref(db, `${BASE_PATH}/ingresos`));
    if (ingresosSnapshot.exists()) {
      const allIngresos = ingresosSnapshot.val();
      for (const ingresoId in allIngresos) {
        const ingreso: IngresoV2 = allIngresos[ingresoId];
        const ingresoDate = new Date(ingreso.fecha);
        
        if (ingresoDate.getMonth() + 1 === currentMonth && ingresoDate.getFullYear() === currentYear) {
          ingresosMes += ingreso.monto;
        }
      }
    }

    // Obtener egresos del mes
    let egresosMes = 0;
    const egresosSnapshot = await get(ref(db, `${BASE_PATH}/egresos`));
    if (egresosSnapshot.exists()) {
      const allEgresos = egresosSnapshot.val();
      for (const egresoId in allEgresos) {
        const egreso: EgresoV2 = allEgresos[egresoId];
        const egresoDate = new Date(egreso.fecha);
        
        if (egresoDate.getMonth() + 1 === currentMonth && egresoDate.getFullYear() === currentYear) {
          egresosMes += egreso.monto;
        }
      }
    }

    // Calcular tasa de cobranza
    const tasaCobranza = cargosMesTotal > 0 ? (cargosMesPagados / cargosMesTotal) * 100 : 0;
    const saldoMes = ingresosMes - egresosMes;

    return {
      recaudadoMes,
      pendienteTotal,
      morosos: morosCount,
      tasaCobranza,
      ingresosMes,
      egresosMes,
      saldoMes,
      totalEmpadronados,
      cargosMesPagados,
      cargosMesTotal
    };
  } catch (error) {
    console.error("Error generando estadísticas V2:", error);
    throw error;
  }
}

// === INGRESOS ===
export async function crearIngresoV2(ingreso: Omit<IngresoV2, 'id'>): Promise<IngresoV2> {
  try {
    const ingresoRef = push(ref(db, `${BASE_PATH}/ingresos`));
    const nuevoIngreso: IngresoV2 = {
      ...ingreso,
      id: ingresoRef.key!
    };
    
    await set(ingresoRef, nuevoIngreso);
    return nuevoIngreso;
  } catch (error) {
    console.error("Error creando ingreso V2:", error);
    throw error;
  }
}

export async function obtenerIngresosV2(): Promise<IngresoV2[]> {
  try {
    const ingresosSnapshot = await get(ref(db, `${BASE_PATH}/ingresos`));
    if (!ingresosSnapshot.exists()) {
      return [];
    }

    const ingresosData = ingresosSnapshot.val();
    return (Object.values(ingresosData) as IngresoV2[]).sort((a, b) => b.fecha - a.fecha);
  } catch (error) {
    console.error("Error obteniendo ingresos V2:", error);
    return [];
  }
}

// === EGRESOS ===
export async function crearEgresoV2(egreso: Omit<EgresoV2, 'id'>): Promise<EgresoV2> {
  try {
    const egresoRef = push(ref(db, `${BASE_PATH}/egresos`));
    const nuevoEgreso: EgresoV2 = {
      ...egreso,
      id: egresoRef.key!
    };
    
    await set(egresoRef, nuevoEgreso);
    return nuevoEgreso;
  } catch (error) {
    console.error("Error creando egreso V2:", error);
    throw error;
  }
}

export async function obtenerEgresosV2(): Promise<EgresoV2[]> {
  try {
    const egresosSnapshot = await get(ref(db, `${BASE_PATH}/egresos`));
    if (!egresosSnapshot.exists()) {
      return [];
    }

    const egresosData = egresosSnapshot.val();
    return (Object.values(egresosData) as EgresoV2[]).sort((a, b) => b.fecha - a.fecha);
  } catch (error) {
    console.error("Error obteniendo egresos V2:", error);
    return [];
  }
}

// === DATOS GENERALES ===
export async function obtenerPagosV2(): Promise<PagoV2[]> {
  try {
    const pagosSnapshot = await get(ref(db, `${BASE_PATH}/pagos`));
    if (!pagosSnapshot.exists()) {
      return [];
    }

    const pagosData = pagosSnapshot.val();
    
    // Convertir a array preservando el ID de Firebase como el ID del pago
    const todosPagos: PagoV2[] = Object.entries(pagosData).map(([key, value]) => ({
      ...(value as PagoV2),
      id: key // Usar la key de Firebase como ID
    }));
    
    return todosPagos.sort((a, b) => b.fechaPagoRegistrada - a.fechaPagoRegistrada);
  } catch (error) {
    console.error("Error obteniendo pagos V2:", error);
    return [];
  }
}

// Obtener solo pagos pendientes de aprobación
export async function obtenerPagosPendientesV2(): Promise<PagoV2[]> {
  try {
    const pagosSnapshot = await get(ref(db, `${BASE_PATH}/pagos`));
    if (!pagosSnapshot.exists()) {
      return [];
    }

    const pagosData = pagosSnapshot.val();
    
    // Convertir a array preservando el ID de Firebase como el ID del pago
    const todosPagos: PagoV2[] = Object.entries(pagosData).map(([key, value]) => ({
      ...(value as PagoV2),
      id: key // Usar la key de Firebase como ID
    }));
    
    // Filtrar solo los pendientes y ordenar por fecha
    return todosPagos
      .filter(p => p.estado === 'pendiente')
      .sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  } catch (error) {
    console.error("Error obteniendo pagos pendientes V2:", error);
    return [];
  }
}

// === APROBAR/RECHAZAR PAGOS ===
export async function aprobarPagoV2(
  pagoId: string, 
  comentario?: string,
  aprobadoPor?: string,
  aprobadoPorNombre?: string
): Promise<void> {
  try {
    // Obtener el pago
    const pagoRef = ref(db, `${BASE_PATH}/pagos/${pagoId}`);
    const pagoSnapshot = await get(pagoRef);
    
    if (!pagoSnapshot.exists()) {
      throw new Error("Pago no encontrado");
    }

    const pago: PagoV2 = pagoSnapshot.val();

    if (pago.estado !== 'pendiente') {
      throw new Error("Solo se pueden aprobar pagos pendientes");
    }

    // Actualizar el pago a aprobado
    const updates: any = {
      estado: 'aprobado',
      fechaAprobacion: Date.now()
    };

    if (comentario) {
      updates.comentarioAprobacion = comentario;
    }
    
    if (aprobadoPor) {
      updates.aprobadoPor = aprobadoPor;
    }
    
    if (aprobadoPorNombre) {
      updates.aprobadoPorNombre = aprobadoPorNombre;
    }

    await update(pagoRef, updates);

    // Ahora sí actualizar el cargo correspondiente
    const chargeSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    let chargePath = '';
    let empadronadoNombre = '';
    
    if (chargeSnapshot.exists()) {
      const allCharges = chargeSnapshot.val();
      for (const period in allCharges) {
        for (const empId in allCharges[period]) {
          for (const cId in allCharges[period][empId]) {
            if (cId === pago.chargeId) {
              chargePath = `${BASE_PATH}/charges/${period}/${empId}/${cId}`;
              const charge = allCharges[period][empId][cId];
              
              // Actualizar saldo del cargo
              const nuevoSaldo = Math.max(0, charge.saldo - pago.monto);
              const chargeUpdates: any = {
                montoPagado: charge.montoPagado + pago.monto,
                saldo: nuevoSaldo,
                estado: nuevoSaldo === 0 ? 'pagado' : 'pendiente'
              };
              
              await update(ref(db, chargePath), chargeUpdates);
              
              // Obtener nombre del empadronado para el ingreso
              try {
                const empadronados = await getEmpadronados();
                const empadronado = empadronados.find(e => e.id === pago.empadronadoId);
                empadronadoNombre = empadronado ? `${empadronado.nombre} ${empadronado.apellidos}` : pago.empadronadoId;
              } catch (err) {
                empadronadoNombre = pago.empadronadoId;
              }
              
              break;
            }
          }
        }
      }
    }

    // Registrar el ingreso en el módulo de Finanzas
    console.log('📊 Intentando registrar ingreso en Finanzas para pago:', pagoId);
    console.log('📊 Datos del pago:', {
      empadronadoId: pago.empadronadoId,
      periodo: pago.periodo,
      monto: pago.monto,
      fechaPagoRegistrada: pago.fechaPagoRegistrada
    });
    console.log('📊 Nombre del empadronado:', empadronadoNombre);
    
    try {
      const periodoFormateado = `${pago.periodo.substring(4)}/${pago.periodo.substring(0, 4)}`;
      const descripcion = `Pago de cuota mensual - Período ${periodoFormateado} - ${empadronadoNombre}`;
      
      console.log('📊 Datos para crear movimiento:', {
        tipo: 'ingreso',
        categoria: 'cuotas',
        monto: pago.monto,
        descripcion,
        fecha: new Date(pago.fechaPagoRegistrada).toISOString()
      });
      
      await crearMovimientoFinanciero({
        tipo: 'ingreso',
        categoria: 'cuotas',
        monto: pago.monto,
        descripcion,
        fecha: new Date(pago.fechaPagoRegistrada).toISOString(),
        comprobantes: [],
        registradoPor: 'sistema',
        registradoPorNombre: 'Sistema Cobranzas',
        observaciones: `Aprobación de pago ID: ${pagoId}${comentario ? ` - ${comentario}` : ''}`
      });
      
      console.log('💰 ✅ Ingreso registrado exitosamente en Finanzas para pago:', pagoId);
    } catch (finanzasError: any) {
      console.error("❌ Error registrando ingreso en Finanzas:", finanzasError);
      console.error("❌ Detalles del error:", {
        message: finanzasError?.message,
        stack: finanzasError?.stack,
        error: finanzasError
      });
      // No lanzar el error para no bloquear la aprobación del pago
    }

    console.log('✅ Pago aprobado:', pagoId);
  } catch (error) {
    console.error("Error aprobando pago:", error);
    throw error;
  }
}

// Función para aprobar masivamente todos los pagos de importación pendientes
export async function aprobarPagosMasivosImportacion(
  onProgreso?: (procesados: number, total: number) => void
): Promise<{ aprobados: number; errores: number }> {
  try {
    const pagosPendientes = await obtenerPagosPendientesV2();
    
    // Filtrar solo los pagos de importación masiva
    const pagosImportacion = pagosPendientes.filter(p => 
      p.metodoPago === 'importacion_masiva' || 
      p.numeroOperacion?.startsWith('IMPORT-')
    );
    
    let aprobados = 0;
    let errores = 0;
    const total = pagosImportacion.length;
    
    for (let i = 0; i < pagosImportacion.length; i++) {
      const pago = pagosImportacion[i];
      
      try {
        await aprobarPagoV2(
          pago.id, 
          'Aprobación masiva de pagos importados',
          'sistema',
          'Sistema - Importación Masiva'
        );
        aprobados++;
      } catch (error) {
        console.error(`Error aprobando pago ${pago.id}:`, error);
        errores++;
      }
      
      if (onProgreso) {
        onProgreso(i + 1, total);
      }
      
      // Pequeña pausa para no sobrecargar Firebase
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { aprobados, errores };
  } catch (error) {
    console.error("Error en aprobación masiva:", error);
    throw error;
  }
}

export async function rechazarPagoV2(pagoId: string, motivoRechazo: string): Promise<void> {
  try {
    if (!motivoRechazo || !motivoRechazo.trim()) {
      throw new Error("Debes proporcionar un motivo de rechazo");
    }

    // Obtener el pago
    const pagoRef = ref(db, `${BASE_PATH}/pagos/${pagoId}`);
    const pagoSnapshot = await get(pagoRef);
    
    if (!pagoSnapshot.exists()) {
      throw new Error("Pago no encontrado");
    }

    const pago: PagoV2 = pagoSnapshot.val();

    if (pago.estado !== 'pendiente') {
      throw new Error("Solo se pueden rechazar pagos pendientes");
    }

    // Actualizar el pago a rechazado
    await update(pagoRef, {
      estado: 'rechazado',
      motivoRechazo: motivoRechazo.trim(),
      fechaRechazo: Date.now()
    });

    // Eliminar el índice anti-duplicados para que pueda volver a pagar
    const indexRef = ref(db, `${BASE_PATH}/pagos_index/${pago.empadronadoId}/${pago.periodo}`);
    await remove(indexRef);

    console.log('❌ Pago rechazado:', pagoId);
  } catch (error) {
    console.error("Error rechazando pago:", error);
    throw error;
  }
}

export async function eliminarPagoV2(pagoId: string): Promise<void> {
  try {
    // Obtener el pago
    const pagoRef = ref(db, `${BASE_PATH}/pagos/${pagoId}`);
    const pagoSnapshot = await get(pagoRef);
    
    if (!pagoSnapshot.exists()) {
      throw new Error("Pago no encontrado");
    }

    const pago: PagoV2 = pagoSnapshot.val();

    // Si el pago fue aprobado, actualizar el charge
    if (pago.estado === 'aprobado') {
      const chargeRef = ref(db, `${BASE_PATH}/charges/${pago.periodo}/${pago.empadronadoId}/${pago.chargeId}`);
      const chargeSnapshot = await get(chargeRef);
      
      if (chargeSnapshot.exists()) {
        const charge: ChargeV2 = chargeSnapshot.val();
        
        // Revertir el pago del charge
        const nuevoMontoPagado = charge.montoPagado - pago.monto;
        const nuevoSaldo = charge.saldo + pago.monto;
        const nuevoEstado = nuevoSaldo > 0 
          ? (Date.now() > charge.fechaVencimiento ? 'moroso' : 'pendiente')
          : 'pagado';
        
        await update(chargeRef, {
          montoPagado: nuevoMontoPagado,
          saldo: nuevoSaldo,
          estado: nuevoEstado,
          esMoroso: nuevoEstado === 'moroso'
        });
        
        console.log('🔄 Charge actualizado al eliminar pago:', pago.chargeId);
      }
    }

    // Eliminar el índice anti-duplicados
    const indexRef = ref(db, `${BASE_PATH}/pagos_index/${pago.empadronadoId}/${pago.periodo}`);
    await remove(indexRef);

    // Eliminar el pago
    await remove(pagoRef);

    console.log('🗑️ Pago eliminado:', pagoId);
  } catch (error) {
    console.error("Error eliminando pago:", error);
    throw error;
  }
}

export async function obtenerChargesV2(): Promise<ChargeV2[]> {
  try {
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    if (!chargesSnapshot.exists()) {
      return [];
    }

    const allCharges = chargesSnapshot.val();
    const chargesList: ChargeV2[] = [];

    for (const period in allCharges) {
      for (const empId in allCharges[period]) {
        for (const chargeId in allCharges[period][empId]) {
          chargesList.push(allCharges[period][empId][chargeId]);
        }
      }
    }

    return chargesList.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  } catch (error) {
    console.error("Error obteniendo charges V2:", error);
    return [];
  }
}

export async function obtenerChargesPorEmpadronadoV2(empadronadoId: string): Promise<ChargeV2[]> {
  try {
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    if (!chargesSnapshot.exists()) {
      return [];
    }

    const allCharges = chargesSnapshot.val();
    const chargesList: ChargeV2[] = [];

    for (const period in allCharges) {
      if (allCharges[period][empadronadoId]) {
        for (const chargeId in allCharges[period][empadronadoId]) {
          chargesList.push(allCharges[period][empadronadoId][chargeId]);
        }
      }
    }

    return chargesList.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  } catch (error) {
    console.error("Error obteniendo charges por empadronado V2:", error);
    return [];
  }
}

// === REPORTES Y FUNCIONES ADICIONALES ===
export async function obtenerReporteDeudores(): Promise<{
  empadronadoId: string;
  nombre: string;
  apellidos: string;
  numeroPadron: string;
  deudaTotal: number;
  periodosVencidos: string[];
  esMoroso: boolean;
}[]> {
  try {
    const empadronados = await getEmpadronados();
    const empadronadosActivos = empadronados.filter(e => e.habilitado);
    const charges = await obtenerChargesV2();
    
    const reporte = empadronadosActivos.map(emp => {
      const chargesEmp = charges.filter(c => c.empadronadoId === emp.id);
      const deudaTotal = chargesEmp.reduce((total, charge) => total + charge.saldo, 0);
      const periodosVencidos = chargesEmp
        .filter(c => c.saldo > 0 && Date.now() > c.fechaVencimiento)
        .map(c => c.periodo);
      const esMoroso = chargesEmp.some(c => c.esMoroso);
      
      return {
        empadronadoId: emp.id,
        nombre: emp.nombre,
        apellidos: emp.apellidos,
        numeroPadron: emp.numeroPadron,
        deudaTotal,
        periodosVencidos,
        esMoroso
      };
    }).filter(reporte => reporte.deudaTotal > 0); // Solo los que tienen deuda
    
    return reporte.sort((a, b) => b.deudaTotal - a.deudaTotal);
  } catch (error) {
    console.error("Error obteniendo reporte de deudores V2:", error);
    return [];
  }
}

export async function obtenerEstadoCuentaEmpadronado(empadronadoId: string): Promise<{
  empadronado: any;
  charges: ChargeV2[];
  pagos: PagoV2[];
  deudaTotal: number;
  ultimoPago?: PagoV2;
}> {
  try {
    const empadronados = await getEmpadronados();
    const empadronado = empadronados.find(e => e.id === empadronadoId);
    
    if (!empadronado) {
      throw new Error("Empadronado no encontrado");
    }
    
    const charges = await obtenerChargesPorEmpadronadoV2(empadronadoId);
    const allPagos = await obtenerPagosV2();
    const pagos = allPagos.filter(p => p.empadronadoId === empadronadoId);
    const deudaTotal = charges.reduce((total, charge) => total + charge.saldo, 0);
    const ultimoPago = pagos[0]; // Ya están ordenados por fecha
    
    return {
      empadronado,
      charges,
      pagos,
      deudaTotal,
      ultimoPago
    };
  } catch (error) {
    console.error("Error obteniendo estado de cuenta V2:", error);
    throw error;
  }
}

// === ANULAR BOLETAS ===
export async function anularChargeV2(
  chargeId: string,
  motivoAnulacion: string,
  anuladoPor: string,
  anuladoPorNombre: string
): Promise<void> {
  try {
    // Buscar el cargo en todos los períodos
    const chargeSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    if (!chargeSnapshot.exists()) {
      throw new Error("No hay cargos en el sistema");
    }
    
    let chargePath = '';
    const allCharges = chargeSnapshot.val();
    
    for (const period in allCharges) {
      for (const empId in allCharges[period]) {
        for (const cId in allCharges[period][empId]) {
          if (cId === chargeId) {
            chargePath = `${BASE_PATH}/charges/${period}/${empId}/${cId}`;
            break;
          }
        }
        if (chargePath) break;
      }
      if (chargePath) break;
    }
    
    if (!chargePath) {
      throw new Error("Cargo no encontrado");
    }
    
    // Actualizar el cargo como anulado
    await update(ref(db, chargePath), {
      anulado: true,
      estado: 'anulado',
      saldo: 0,
      fechaAnulacion: Date.now(),
      anuladoPor,
      anuladoPorNombre,
      motivoAnulacion
    });
    
    console.log(`✅ Cargo ${chargeId} anulado correctamente`);
  } catch (error) {
    console.error("Error anulando cargo:", error);
    throw error;
  }
}

// Anular múltiples boletas a la vez
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