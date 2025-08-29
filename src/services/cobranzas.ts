import { ref, push, set, get, update, remove, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { db } from '@/config/firebase';
import { 
  Pago, 
  Egreso, 
  ConfiguracionCobranzas, 
  EstadisticasCobranzas, 
  ReporteCobranza,
  DeclaracionJurada,
  PlantillaSancion 
} from '@/types/cobranzas';
import { Empadronado } from '@/types/empadronados';

// Servicios para Pagos
export const crearPago = async (pagoData: Omit<Pago, 'id' | 'createdAt' | 'updatedAt'>, userUid: string): Promise<string> => {
  const pagosRef = ref(db, 'cobranzas/pagos');
  const nuevoPagoRef = push(pagosRef);
  
  const pago: Pago = {
    ...pagoData,
    id: nuevoPagoRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creadoPor: userUid
  };
  
  await set(nuevoPagoRef, pago);
  return nuevoPagoRef.key!;
};

export const obtenerPagos = async (): Promise<Pago[]> => {
  const pagosRef = ref(db, 'cobranzas/pagos');
  const snapshot = await get(pagosRef);
  
  if (!snapshot.exists()) return [];
  
  const pagos = Object.values(snapshot.val()) as Pago[];
  return pagos.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const obtenerPagosPorEmpadronado = async (empadronadoId: string): Promise<Pago[]> => {
  const pagosRef = ref(db, 'cobranzas/pagos');
  const consulta = query(pagosRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const snapshot = await get(consulta);
  
  if (!snapshot.exists()) return [];
  
  return Object.values(snapshot.val()) as Pago[];
};

export const actualizarPago = async (pagoId: string, updates: Partial<Pago>, userUid: string): Promise<void> => {
  const pagoRef = ref(db, `cobranzas/pagos/${pagoId}`);
  await update(pagoRef, {
    ...updates,
    updatedAt: Date.now(),
    pagadoPor: userUid
  });
};

// Servicios para Egresos
export const crearEgreso = async (egresoData: Omit<Egreso, 'id' | 'createdAt' | 'updatedAt'>, userUid: string): Promise<string> => {
  const egresosRef = ref(db, 'cobranzas/egresos');
  const nuevoEgresoRef = push(egresosRef);
  
  const egreso: Egreso = {
    ...egresoData,
    id: nuevoEgresoRef.key!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    realizadoPor: userUid
  };
  
  await set(nuevoEgresoRef, egreso);
  return nuevoEgresoRef.key!;
};

export const obtenerEgresos = async (): Promise<Egreso[]> => {
  const egresosRef = ref(db, 'cobranzas/egresos');
  const snapshot = await get(egresosRef);
  
  if (!snapshot.exists()) return [];
  
  const egresos = Object.values(snapshot.val()) as Egreso[];
  return egresos.sort((a, b) => b.updatedAt - a.updatedAt);
};

// Servicios para Configuración
export const obtenerConfiguracion = async (): Promise<ConfiguracionCobranzas> => {
  const configRef = ref(db, 'cobranzas/configuracion');
  const snapshot = await get(configRef);
  
  if (!snapshot.exists()) {
    // Configuración por defecto
    const configDefault: ConfiguracionCobranzas = {
      montoMensual: 50,
      diaVencimiento: 15,
      diaCierre: 14,
      diasProntoPago: 3,
      porcentajeProntoPago: 10,
      porcentajeMorosidad: 5,
      porcentajeSancion: 10,
      serieComprobantes: 'COB',
      numeroComprobanteActual: 1,
      sede: 'Principal'
    };
    await set(configRef, configDefault);
    return configDefault;
  }
  
  return snapshot.val() as ConfiguracionCobranzas;
};

export const actualizarConfiguracion = async (config: ConfiguracionCobranzas): Promise<void> => {
  const configRef = ref(db, 'cobranzas/configuracion');
  await set(configRef, config);
};

// Servicios para Declaraciones Juradas
export const crearDeclaracionJurada = async (declaracionData: Omit<DeclaracionJurada, 'id' | 'fechaSolicitud'>): Promise<string> => {
  const declaracionesRef = ref(db, 'cobranzas/declaracionesJuradas');
  const nuevaDeclaracionRef = push(declaracionesRef);
  
  const declaracion: DeclaracionJurada = {
    ...declaracionData,
    id: nuevaDeclaracionRef.key!,
    fechaSolicitud: new Date().toLocaleDateString('es-PE')
  };
  
  await set(nuevaDeclaracionRef, declaracion);
  return nuevaDeclaracionRef.key!;
};

export const aprobarDeclaracionJurada = async (declaracionId: string, aprobadoPor: 'presidente' | 'fiscal', userUid: string): Promise<void> => {
  const declaracionRef = ref(db, `cobranzas/declaracionesJuradas/${declaracionId}`);
  const snapshot = await get(declaracionRef);
  
  if (snapshot.exists()) {
    const declaracion = snapshot.val() as DeclaracionJurada;
    const updates: Partial<DeclaracionJurada> = {};
    
    if (aprobadoPor === 'presidente') {
      updates.aprobadoPorPresidente = true;
    } else {
      updates.aprobadoPorFiscal = true;
    }
    
    // Si ambos aprobaron, cambiar estado
    if ((declaracion.aprobadoPorPresidente || aprobadoPor === 'presidente') && 
        (declaracion.aprobadoPorFiscal || aprobadoPor === 'fiscal')) {
      updates.estado = 'aprobado';
      updates.fechaAprobacion = new Date().toLocaleDateString('es-PE');
    }
    
    await update(declaracionRef, updates);
  }
};

// Servicios para Sanciones
export const aplicarSancion = async (sancionData: Omit<PlantillaSancion, 'id'>): Promise<string> => {
  const sancionesRef = ref(db, 'cobranzas/sanciones');
  const nuevaSancionRef = push(sancionesRef);
  
  const sancion: PlantillaSancion = {
    ...sancionData,
    id: nuevaSancionRef.key!
  };
  
  await set(nuevaSancionRef, sancion);
  return nuevaSancionRef.key!;
};

// Generar estadísticas
export const generarEstadisticas = async (): Promise<EstadisticasCobranzas> => {
  const [pagos, empadronados, egresos] = await Promise.all([
    obtenerPagos(),
    obtenerEmpadronados(),
    obtenerEgresos()
  ]);
  
  const mesActual = new Date().getMonth() + 1;
  const añoActual = new Date().getFullYear();
  
  const pagosMesActual = pagos.filter(p => p.mes === mesActual && p.año === añoActual);
  const egresosMesActual = egresos.filter(e => {
    const fechaEgreso = new Date(e.fecha.split('/').reverse().join('-'));
    return fechaEgreso.getMonth() + 1 === mesActual && fechaEgreso.getFullYear() === añoActual;
  });
  
  const totalRecaudado = pagosMesActual
    .filter(p => p.estado === 'pagado')
    .reduce((sum, p) => sum + p.monto, 0);
  
  const totalEgresos = egresosMesActual.reduce((sum, e) => sum + e.monto, 0);
  
  const totalPendiente = pagosMesActual
    .filter(p => p.estado === 'pendiente')
    .reduce((sum, p) => sum + p.monto, 0);
  
  const totalMorosos = pagosMesActual.filter(p => p.estado === 'moroso').length;
  
  const tasaCobranza = empadronados.length > 0 ? 
    (pagosMesActual.filter(p => p.estado === 'pagado').length / empadronados.length) * 100 : 0;
  
  return {
    totalEmpadronados: empadronados.length,
    totalRecaudado,
    totalPendiente,
    totalMorosos,
    tasaCobranza,
    ingresosMes: totalRecaudado,
    egresosMes: totalEgresos,
    saldoActual: totalRecaudado - totalEgresos
  };
};

// Función auxiliar para obtener empadronados
const obtenerEmpadronados = async (): Promise<Empadronado[]> => {
  const { getEmpadronados } = await import('@/services/empadronados');
  return await getEmpadronados();
};

// Generar pagos automáticamente para todos los empadronados
export const generarPagosMensuales = async (mes: number, año: number, userUid: string): Promise<void> => {
  const empadronados = await obtenerEmpadronados();
  const config = await obtenerConfiguracion();
  
  const fechaVencimiento = new Date(año, mes - 1, config.diaVencimiento).toLocaleDateString('es-PE');
  
  for (const empadronado of empadronados) {
    if (empadronado.habilitado && empadronado.vive) {
      // Verificar si ya existe pago para este mes/año
      const pagosExistentes = await obtenerPagosPorEmpadronado(empadronado.id);
      const pagoExiste = pagosExistentes.some(p => p.mes === mes && p.año === año);
      
      if (!pagoExiste) {
        await crearPago({
          empadronadoId: empadronado.id,
          numeroPadron: empadronado.numeroPadron,
          mes,
          año,
          monto: config.montoMensual,
          montoOriginal: config.montoMensual,
          fechaVencimiento,
          estado: 'pendiente',
          descuentos: [],
          recargos: [],
          creadoPor: userUid
        }, userUid);
      }
    }
  }
};

// Generar pagos desde enero 15 hasta la fecha actual
export const generarPagosDesdeEnero = async (userUid: string): Promise<void> => {
  const fechaInicio = new Date(2025, 0, 15); // 15 enero 2025
  const fechaActual = new Date();
  
  let mesActual = fechaInicio.getMonth() + 1;
  let añoActual = fechaInicio.getFullYear();
  
  while (añoActual < fechaActual.getFullYear() || 
         (añoActual === fechaActual.getFullYear() && mesActual <= fechaActual.getMonth() + 1)) {
    
    await generarPagosMensuales(mesActual, añoActual, userUid);
    
    mesActual++;
    if (mesActual > 12) {
      mesActual = 1;
      añoActual++;
    }
  }
};

// Aplicar cierres automáticos y calcular morosidad
export const ejecutarCierreMensual = async (userUid: string): Promise<void> => {
  const config = await obtenerConfiguracion();
  const mesActual = new Date().getMonth() + 1;
  const añoActual = new Date().getFullYear();
  
  const pagos = await obtenerPagos();
  const pagosPendientes = pagos.filter(p => 
    p.mes === mesActual && 
    p.año === añoActual && 
    p.estado === 'pendiente'
  );
  
  // Aplicar morosidad a pagos no pagados
  for (const pago of pagosPendientes) {
    const recargo = {
      id: `mor_${Date.now()}`,
      tipo: 'morosidad' as const,
      porcentaje: config.porcentajeMorosidad,
      monto: (pago.montoOriginal * config.porcentajeMorosidad) / 100,
      motivo: 'Recargo por morosidad',
      aplicadoPor: userUid,
      fechaAplicacion: new Date().toLocaleDateString('es-PE'),
      activo: true
    };
    
    await actualizarPago(pago.id, {
      estado: 'moroso',
      recargos: [...(pago.recargos || []), recargo],
      monto: pago.monto + recargo.monto
    }, userUid);
  }
};