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
  const fechaIngreso = new Date(empadronado.fechaIngreso);
  const policyDate = new Date(2025, 0, 15); // 15/01/2025
  
  // Si ingresó antes del 15/01/2025, cobra desde enero 2025
  if (fechaIngreso < policyDate) {
    return new Date(2025, 0, 1); // enero 2025
  }
  
  // Si ingresó después, aplicar regla de día de cierre
  const day = fechaIngreso.getDate();
  if (day <= config.diaCierre) {
    // Cobra desde ese mes
    return new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth(), 1);
  } else {
    // Cobra desde el mes siguiente
    return new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() + 1, 1);
  }
}

function calculateDueDate(chargeDate: Date, config: ConfiguracionCobranzasV2): Date {
  // Vencimiento: día configurable del mes siguiente
  const nextMonth = new Date(chargeDate.getFullYear(), chargeDate.getMonth() + 1, config.diaVencimiento);
  return nextMonth;
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
      console.log(`Cargo ya existe para ${empadronadoId} en período ${period}`);
      return null;
    }

    const empadronados = await getEmpadronados();
    const empadronado = empadronados.find(e => e.id === empadronadoId);
    
    if (!empadronado || !empadronado.habilitado) {
      console.log(`Empadronado ${empadronadoId} no encontrado o no habilitado`);
      return null;
    }

    const chargeStartDate = calculateChargeDate(empadronado, config);
    const periodDate = new Date(parseInt(period.substring(0, 4)), parseInt(period.substring(4)) - 1, 1);
    
    // Solo generar si el período es >= fecha de inicio de cobro
    if (periodDate < chargeStartDate) {
      console.log(`Período ${period} anterior a fecha de inicio de cobro para ${empadronadoId}`);
      return null;
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
    
    // Verificar si ya está generado
    if (await isPeriodGenerated(currentPeriod)) {
      throw new Error(`El período ${currentPeriod} ya está generado`);
    }

    const empadronados = await getEmpadronados();
    const empadronadosActivos = empadronados.filter(e => e.habilitado);

    console.log(`Generando mes actual ${currentPeriod} para ${empadronadosActivos.length} empadronados`);

    // Generar cargos para todos los empadronados activos
    const promises = empadronadosActivos.map(emp => 
      generarCargoMensual(emp.id, currentPeriod, config)
    );
    
    await Promise.all(promises);
    
    // Marcar período como generado
    await markPeriodGenerated(currentPeriod, generadoPor);
    
    console.log(`Generación completada para período ${currentPeriod}`);
  } catch (error) {
    console.error("Error en generarMesActual:", error);
    throw error;
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
    
    // Generar todos los períodos desde enero 2025 hasta ahora
    const periods: string[] = [];
    const tempDate = new Date(startDate);
    
    while (tempDate <= currentDate) {
      periods.push(formatPeriod(tempDate));
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    console.log(`Períodos a generar: ${periods.join(', ')}`);

    // Generar cargos para cada período y empadronado
    for (const period of periods) {
      console.log(`Procesando período ${period}...`);
      
      const promises = empadronadosActivos.map(emp => 
        generarCargoMensual(emp.id, period, config)
      );
      
      await Promise.all(promises);
      
      // Marcar período como generado si no lo está
      if (!(await isPeriodGenerated(period))) {
        await markPeriodGenerated(period, generadoPor);
      }
    }
    
    console.log("Backfill completado exitosamente");
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

    // Verificar si ya existe pago para este período (anti-duplicados)
    const existePago = await existsPagoForPeriod(charge.empadronadoId, charge.periodo);
    if (existePago) {
      throw new Error("Ya existe un pago para este período");
    }

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

    // Crear el pago
    const pagoRef = push(ref(db, `${BASE_PATH}/pagos`));
    const pago: PagoV2 = {
      id: pagoRef.key!,
      chargeId: charge.id,
      empadronadoId: charge.empadronadoId,
      periodo: charge.periodo,
      monto: montoFinal,
      montoOriginal: monto,
      descuentoProntoPago: descuentoProntoPago > 0 ? descuentoProntoPago : undefined,
      metodoPago: metodoPago as any,
      numeroOperacion,
      fechaPago: Date.now(),
      fechaCreacion: Date.now(),
      observaciones
    };

    await set(pagoRef, pago);

    // Actualizar el cargo
    const nuevoSaldo = Math.max(0, charge.saldo - montoFinal);
    const updates: any = {
      montoPagado: charge.montoPagado + montoFinal,
      saldo: nuevoSaldo,
      estado: nuevoSaldo === 0 ? 'pagado' : 'pendiente'
    };

    await update(ref(db, chargePath), updates);

    // Crear índice anti-duplicados
    const indexRef = ref(db, `${BASE_PATH}/pagos_index/${charge.empadronadoId}/${charge.periodo}`);
    await set(indexRef, {
      chargeId: charge.id,
      fechaPago: Date.now()
    });

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

    // Obtener todos los cargos
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    const empadronadosMorosos = new Set<string>();

    if (chargesSnapshot.exists()) {
      const allCharges = chargesSnapshot.val();
      
      for (const period in allCharges) {
        for (const empId in allCharges[period]) {
          for (const chargeId in allCharges[period][empId]) {
            const charge: ChargeV2 = allCharges[period][empId][chargeId];
            
            // Pendiente total (todos los saldos)
            pendienteTotal += charge.saldo;
            
            // Cargos del mes actual
            if (period === currentPeriod) {
              cargosMesTotal++;
              if (charge.estado === 'pagado') {
                cargosMesPagados++;
              }
            }
            
            // Marcar morosos
            if (charge.esMoroso) {
              empadronadosMorosos.add(empId);
            }
          }
        }
      }
    }

    morosCount = empadronadosMorosos.size;

    // Obtener pagos del mes actual
    const pagosSnapshot = await get(ref(db, `${BASE_PATH}/pagos`));
    if (pagosSnapshot.exists()) {
      const allPagos = pagosSnapshot.val();
      for (const pagoId in allPagos) {
        const pago: PagoV2 = allPagos[pagoId];
        const pagoDate = new Date(pago.fechaPago);
        
        if (pagoDate.getMonth() + 1 === currentMonth && pagoDate.getFullYear() === currentYear) {
          recaudadoMes += pago.monto;
        }
      }
    }

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
    return (Object.values(pagosData) as PagoV2[]).sort((a, b) => b.fechaPago - a.fechaPago);
  } catch (error) {
    console.error("Error obteniendo pagos V2:", error);
    return [];
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