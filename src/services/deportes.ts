import { db } from '@/config/firebase';
import { ref, push, set, get, update, remove, query, orderByChild, equalTo, orderByKey, limitToLast } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Cancha, 
  Reserva, 
  ConfiguracionDeportes, 
  EventoEspecial, 
  EstadisticasDeportes,
  ComprobanteReserva,
  FormReserva,
  FormPago,
  EstadoReserva 
} from '@/types/deportes';
import { crearIngreso } from './cobranzas';

const storage = getStorage();

// ===========================================
// GESTIÓN DE CANCHAS
// ===========================================

export const obtenerCanchas = async (): Promise<Cancha[]> => {
  try {
    const snapshot = await get(ref(db, 'deportes/canchas'));
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    return Object.keys(data).map(id => ({
      id,
      ...data[id]
    }));
  } catch (error) {
    console.error('Error al obtener canchas:', error);
    throw error;
  }
};

export const obtenerCancha = async (id: string): Promise<Cancha | null> => {
  try {
    const snapshot = await get(ref(db, `deportes/canchas/${id}`));
    if (!snapshot.exists()) return null;
    
    return {
      id,
      ...snapshot.val()
    };
  } catch (error) {
    console.error('Error al obtener cancha:', error);
    throw error;
  }
};

export const crearCancha = async (cancha: Omit<Cancha, 'id'>): Promise<string> => {
  try {
    const newRef = push(ref(db, 'deportes/canchas'));
    await set(newRef, {
      ...cancha,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return newRef.key!;
  } catch (error) {
    console.error('Error al crear cancha:', error);
    throw error;
  }
};

export const actualizarCancha = async (id: string, updates: Partial<Cancha>): Promise<void> => {
  try {
    await update(ref(db, `deportes/canchas/${id}`), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al actualizar cancha:', error);
    throw error;
  }
};

// ===========================================
// GESTIÓN DE RESERVAS
// ===========================================

export const obtenerReservas = async (filtros?: {
  canchaId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: EstadoReserva;
}): Promise<Reserva[]> => {
  try {
  const snapshot = await get(ref(db, 'deportes/reservas'));
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    let reservas: Reserva[] = Object.keys(data).map(id => ({
      id,
      ...data[id]
    }));
    
    // Filtros adicionales en memoria
    if (filtros?.fechaInicio) {
      reservas = reservas.filter(r => r.fechaInicio >= filtros.fechaInicio!);
    }
    
    if (filtros?.fechaFin) {
      reservas = reservas.filter(r => r.fechaFin <= filtros.fechaFin!);
    }
    
    if (filtros?.estado) {
      reservas = reservas.filter(r => r.estado === filtros.estado);
    }
    
    return reservas.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    throw error;
  }
};

export const obtenerReserva = async (id: string): Promise<Reserva | null> => {
  try {
    const snapshot = await get(ref(db, `deportes/reservas/${id}`));
    if (!snapshot.exists()) return null;
    
    return {
      id,
      ...snapshot.val()
    };
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    throw error;
  }
};

export const crearReserva = async (
  reservaData: FormReserva, 
  createdBy: string
): Promise<string> => {
  try {
    // Validar disponibilidad
    const disponible = await validarDisponibilidad(
      reservaData.canchaId,
      reservaData.fechaInicio,
      reservaData.fechaFin
    );
    
    if (!disponible) {
      throw new Error('El horario seleccionado no está disponible');
    }
    
    // Obtener datos de la cancha para calcular precio
    const cancha = await obtenerCancha(reservaData.canchaId);
    if (!cancha) {
      throw new Error('Cancha no encontrada');
    }
    
    // Calcular duración y precio
    const fechaInicio = new Date(reservaData.fechaInicio);
    const fechaFin = new Date(reservaData.fechaFin);
    const duracionHoras = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60);
    
    const precio = calcularPrecio(cancha, duracionHoras, reservaData.esAportante);
    
    const reserva: Omit<Reserva, 'id'> = {
      ...reservaData,
      duracionHoras,
      estado: 'pendiente',
      precio,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      ...(reservaData.recurrente?.esRecurrente && {
        recurrente: {
          ...reservaData.recurrente,
          reservasGeneradas: []
        }
      })
    };
    
    const newRef = push(ref(db, 'deportes/reservas'));
    await set(newRef, reserva);
    
    // Si es recurrente, generar reservas adicionales
    if (reservaData.recurrente?.esRecurrente) {
      await generarReservasRecurrentes(newRef.key!, reserva, reservaData.recurrente);
    }
    
    return newRef.key!;
  } catch (error) {
    console.error('Error al crear reserva:', error);
    throw error;
  }
};

export const actualizarReserva = async (
  id: string, 
  updates: Partial<Reserva>
): Promise<void> => {
  try {
    await update(ref(db, `deportes/reservas/${id}`), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    throw error;
  }
};

export const registrarPago = async (
  reservaId: string,
  formPago: FormPago,
  actorUid: string
): Promise<void> => {
  try {
    const reserva = await obtenerReserva(reservaId);
    if (!reserva) {
      throw new Error('Reserva no encontrada');
    }
    
    let voucherUrl: string | undefined;
    
    // Subir voucher si existe
    if (formPago.voucher) {
      const timestamp = Date.now();
      const fileName = `vouchers/deportes/${reservaId}_${timestamp}.${formPago.voucher.name.split('.').pop()}`;
      const fileRef = storageRef(storage, fileName);
      
      await uploadBytes(fileRef, formPago.voucher);
      voucherUrl = await getDownloadURL(fileRef);
    }
    
    const montoPago = formPago.esPrepago ? formPago.montoPrepago! : reserva.precio.total;
    const saldoPendiente = formPago.esPrepago ? (reserva.precio.total - formPago.montoPrepago!) : 0;
    
    // Actualizar reserva
    const pagoData = {
      metodoPago: formPago.metodoPago,
      numeroOperacion: formPago.numeroOperacion,
      voucherUrl,
      fechaPago: new Date().toISOString(),
      esPrepago: formPago.esPrepago || false,
      montoPrepago: formPago.montoPrepago,
      saldoPendiente
    };
    
    await actualizarReserva(reservaId, {
      estado: saldoPendiente > 0 ? 'pendiente' : 'pagado',
      pago: pagoData
    });
    
    // Crear ingreso en cobranzas
    const cancha = await obtenerCancha(reserva.canchaId);
    const ingresoId = await crearIngreso({
      concepto: `Reserva ${cancha?.nombre} - ${reserva.nombreCliente} (${cancha?.tipo === 'futbol' ? 'Fútbol' : 'Vóley'})`,
      categoria: 'otros',
      monto: montoPago,
      fecha: new Date().toISOString().split('T')[0],
      metodoPago: formPago.metodoPago,
      numeroOperacion: formPago.numeroOperacion,
      archivoUrl: voucherUrl
    }, actorUid);
    
    // Vincular ingreso con reserva
    await actualizarReserva(reservaId, { ingresoId });
    
  } catch (error) {
    console.error('Error al registrar pago:', error);
    throw error;
  }
};

// ===========================================
// VALIDACIONES Y REGLAS DE NEGOCIO
// ===========================================

export const validarDisponibilidad = async (
  canchaId: string,
  fechaInicio: string,
  fechaFin: string,
  excludeReservaId?: string
): Promise<boolean> => {
  try {
    const reservas = await obtenerReservas({ canchaId });
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Verificar traslapes
    const conflictos = reservas.filter(reserva => {
      if (reserva.id === excludeReservaId) return false;
      if (reserva.estado === 'cancelado' || reserva.estado === 'no-show') return false;
      
      const reservaInicio = new Date(reserva.fechaInicio);
      const reservaFin = new Date(reserva.fechaFin);
      
      return !(fin <= reservaInicio || inicio >= reservaFin);
    });
    
    return conflictos.length === 0;
  } catch (error) {
    console.error('Error al validar disponibilidad:', error);
    return false;
  }
};

export const validarLimitesReserva = async (
  dni: string,
  fecha: string
): Promise<boolean> => {
  try {
    const config = await obtenerConfiguracion();
    const inicioDelDia = fecha.split('T')[0] + 'T00:00:00.000Z';
    const finDelDia = fecha.split('T')[0] + 'T23:59:59.999Z';
    
    const reservasDelDia = await obtenerReservas({
      fechaInicio: inicioDelDia,
      fechaFin: finDelDia
    });
    
    const reservasUsuario = reservasDelDia.filter(r => 
      r.dni === dni && 
      r.estado !== 'cancelado' && 
      r.estado !== 'no-show'
    );
    
    return reservasUsuario.length < config.limitesReservas.reservasPorPersonaPorDia;
  } catch (error) {
    console.error('Error al validar límites:', error);
    return false;
  }
};

// ===========================================
// CÁLCULOS DE PRECIOS
// ===========================================

export const calcularPrecio = (
  cancha: Cancha,
  duracionHoras: number,
  esAportante: boolean
): { base: number; luz: number; descuentoAportante: number; total: number } => {
  const precioBase = cancha.configuracion.precioHora * duracionHoras;
  
  // Calcular costo de luz según duración
  let precioLuz = 0;
  if (duracionHoras <= 1) {
    precioLuz = cancha.configuracion.modificadorLuz['1h'];
  } else if (duracionHoras <= 2) {
    precioLuz = cancha.configuracion.modificadorLuz['2h'];
  } else {
    precioLuz = cancha.configuracion.modificadorLuz['3h'];
  }
  
  // Calcular descuento aportante
  const descuentoAportante = esAportante ? 
    (precioBase + precioLuz) * (cancha.configuracion.tarifaAportante / 100) : 0;
  
  const total = precioBase + precioLuz - descuentoAportante;
  
  return {
    base: precioBase,
    luz: precioLuz,
    descuentoAportante,
    total: Math.max(0, total)
  };
};

// ===========================================
// CONFIGURACIÓN
// ===========================================

export const obtenerConfiguracion = async (): Promise<ConfiguracionDeportes> => {
  try {
    const snapshot = await get(ref(db, 'deportes/configuracion'));
    if (!snapshot.exists()) {
      // Retornar configuración por defecto
      return {
        limitesReservas: {
          reservasPorPersonaPorDia: 2,
          horasAntesParaCancelar: 2,
          horasAntesParaNoShow: 1
        },
        notificaciones: {
          whatsappTemplate: "Hola {nombre}, tu reserva para {cancha} el {fecha} de {horaInicio} a {horaFin} está confirmada. Total: S/{total}",
          recordatorioHoras: [24, 2]
        },
        horarios: {
          apertura: "06:00",
          cierre: "22:00",
          ultimaReserva: "21:00"
        },
        depositos: {
          requiereDeposito: false,
          montoDeposito: 50,
          equipos: {
            red: true,
            pelotas: true,
            tableros: false
          }
        }
      };
    }
    
    return snapshot.val();
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    throw error;
  }
};

export const actualizarConfiguracion = async (
  config: Partial<ConfiguracionDeportes>
): Promise<void> => {
  try {
    await update(ref(db, 'deportes/configuracion'), config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    throw error;
  }
};

// ===========================================
// RESERVAS RECURRENTES
// ===========================================

const generarReservasRecurrentes = async (
  reservaBaseId: string,
  reservaBase: Omit<Reserva, 'id'>,
  recurrente: { frecuencia: 'semanal' | 'quincenal' | 'mensual'; fechaFin: string }
): Promise<void> => {
  const reservasGeneradas: string[] = [reservaBaseId];
  const fechaInicio = new Date(reservaBase.fechaInicio);
  const fechaLimite = new Date(recurrente.fechaFin);
  
  let intervaloDias: number;
  switch (recurrente.frecuencia) {
    case 'semanal': intervaloDias = 7; break;
    case 'quincenal': intervaloDias = 14; break;
    case 'mensual': intervaloDias = 30; break;
  }
  
  let fechaActual = new Date(fechaInicio);
  fechaActual.setDate(fechaActual.getDate() + intervaloDias);
  
  while (fechaActual <= fechaLimite) {
    const duracionMs = new Date(reservaBase.fechaFin).getTime() - new Date(reservaBase.fechaInicio).getTime();
    const nuevaFechaFin = new Date(fechaActual.getTime() + duracionMs);
    
    // Verificar disponibilidad
    const disponible = await validarDisponibilidad(
      reservaBase.canchaId,
      fechaActual.toISOString(),
      nuevaFechaFin.toISOString()
    );
    
    if (disponible) {
      const nuevaReserva = {
        ...reservaBase,
        fechaInicio: fechaActual.toISOString(),
        fechaFin: nuevaFechaFin.toISOString(),
        recurrente: {
          esRecurrente: true,
          frecuencia: recurrente.frecuencia,
          fechaFin: recurrente.fechaFin,
          reservasGeneradas: []
        }
      };
      
      const newRef = push(ref(db, 'deportes/reservas'));
      await set(newRef, nuevaReserva);
      reservasGeneradas.push(newRef.key!);
    }
    
    fechaActual.setDate(fechaActual.getDate() + intervaloDias);
  }
  
  // Actualizar la reserva base con las IDs generadas
  await update(ref(db, `deportes/reservas/${reservaBaseId}/recurrente`), {
    reservasGeneradas
  });
};

// ===========================================
// ESTADÍSTICAS
// ===========================================

export const obtenerEstadisticas = async (
  fechaInicio?: string,
  fechaFin?: string
): Promise<EstadisticasDeportes> => {
  try {
    const reservas = await obtenerReservas({ fechaInicio, fechaFin });
    const canchas = await obtenerCanchas();
    
    const reservasPagadas = reservas.filter(r => r.estado === 'pagado' || r.estado === 'completado');
    const ingresosTotales = reservasPagadas.reduce((sum, r) => sum + r.precio.total, 0);
    
    // Canchas más usadas
    const usosPorCancha = reservasPagadas.reduce((acc, r) => {
      acc[r.canchaId] = (acc[r.canchaId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const canchasMasUsadas = Object.entries(usosPorCancha)
      .map(([canchaId, reservas]) => ({
        canchaId,
        nombre: canchas.find(c => c.id === canchaId)?.nombre || 'Desconocida',
        reservas
      }))
      .sort((a, b) => b.reservas - a.reservas)
      .slice(0, 5);
    
    // Horarios populares
    const usosPorHora = reservasPagadas.reduce((acc, r) => {
      const hora = new Date(r.fechaInicio).getHours();
      const horaStr = `${hora.toString().padStart(2, '0')}:00`;
      acc[horaStr] = (acc[horaStr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const horariosPopulares = Object.entries(usosPorHora)
      .map(([hora, reservas]) => ({ hora, reservas }))
      .sort((a, b) => b.reservas - a.reservas)
      .slice(0, 8);
    
    // Ocupación promedio (simplificado)
    const ocupacionPromedio = Math.min(100, (reservasPagadas.length / (canchas.length * 30)) * 100);
    
    return {
      reservasDelMes: reservasPagadas.length,
      ingresosTotales,
      canchasMasUsadas,
      horariosPopulares,
      ocupacionPromedio
    };
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};

// ===========================================
// PROCESOS AUTOMÁTICOS
// ===========================================

export const procesarNoShows = async (): Promise<void> => {
  try {
    const ahora = new Date();
    const config = await obtenerConfiguracion();
    const horasLimite = config.limitesReservas.horasAntesParaNoShow;
    
    const reservasPendientes = await obtenerReservas({ estado: 'pendiente' });
    
    for (const reserva of reservasPendientes) {
      const inicioReserva = new Date(reserva.fechaInicio);
      const horasTranscurridas = (ahora.getTime() - inicioReserva.getTime()) / (1000 * 60 * 60);
      
      if (horasTranscurridas > horasLimite) {
        await actualizarReserva(reserva.id, { estado: 'no-show' });
      }
    }
  } catch (error) {
    console.error('Error al procesar no-shows:', error);
    throw error;
  }
};

// ===========================================
// COMPROBANTES Y WHATSAPP
// ===========================================

export const generarComprobanteReserva = async (reservaId: string): Promise<ComprobanteReserva> => {
  try {
    const reserva = await obtenerReserva(reservaId);
    if (!reserva) throw new Error('Reserva no encontrada');
    
    const cancha = await obtenerCancha(reserva.canchaId);
    if (!cancha) throw new Error('Cancha no encontrada');
    
    const numeroComprobante = `DEP-${reservaId.toUpperCase().slice(-8)}`;
    const qrCode = `${window.location.origin}/deportes/reserva/${reservaId}`;
    
    return {
      reservaId,
      numeroComprobante,
      fechaEmision: new Date().toISOString(),
      cliente: {
        nombre: reserva.nombreCliente,
        dni: reserva.dni,
        telefono: reserva.telefono
      },
      cancha: {
        nombre: cancha.nombre,
        ubicacion: cancha.ubicacion === 'boulevard' ? 'Boulevard' : 'Quinta Llana'
      },
      horario: {
        fecha: new Date(reserva.fechaInicio).toLocaleDateString(),
        inicio: new Date(reserva.fechaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        fin: new Date(reserva.fechaFin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        duracion: reserva.duracionHoras
      },
      precio: reserva.precio,
      qrCode,
      observaciones: reserva.observaciones
    };
  } catch (error) {
    console.error('Error al generar comprobante:', error);
    throw error;
  }
};

export const generarEnlaceWhatsApp = (
  telefono: string,
  comprobante: ComprobanteReserva
): string => {
  const mensaje = `¡Hola ${comprobante.cliente.nombre}! 

Tu reserva está confirmada:
🏟️ *${comprobante.cancha.nombre}* (${comprobante.cancha.ubicacion})
📅 ${comprobante.horario.fecha}
⏰ ${comprobante.horario.inicio} - ${comprobante.horario.fin}
💰 Total: S/${comprobante.precio.total}

Comprobante: ${comprobante.numeroComprobante}

¡Nos vemos pronto! 🏆`;
  
  const telefonoLimpio = telefono.replace(/\D/g, '');
  return `https://wa.me/51${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
};