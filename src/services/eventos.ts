import { ref, push, get, set, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";
import { Evento, InscripcionEvento, FormularioEvento, EstadisticasEventos } from "@/types/eventos";

// ========== EVENTOS ==========

export const crearEvento = async (eventoData: FormularioEvento, uid: string): Promise<string> => {
  const eventosRef = ref(db, "eventos");
  const nuevoEventoRef = push(eventosRef);
  
  const evento: Evento = {
    id: nuevoEventoRef.key!,
    ...eventoData,
    fechaInicio: new Date(eventoData.fechaInicio).getTime(),
    fechaFin: new Date(eventoData.fechaFin).getTime(),
    cuposDisponibles: eventoData.cuposMaximos,
    fechaCreacion: Date.now(),
    creadoPor: uid,
  };
  
  await set(nuevoEventoRef, evento);
  return nuevoEventoRef.key!;
};

export const obtenerEventos = async (): Promise<Evento[]> => {
  const eventosRef = ref(db, "eventos");
  const snapshot = await get(eventosRef);
  
  if (!snapshot.exists()) return [];
  
  const eventos: Evento[] = [];
  snapshot.forEach((childSnapshot) => {
    eventos.push(childSnapshot.val());
  });
  
  return eventos.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
};

export const obtenerEventosActivos = async (): Promise<Evento[]> => {
  const eventos = await obtenerEventos();
  const ahora = Date.now();
  
  return eventos.filter(
    (evento) => 
      evento.estado === 'activo' && 
      evento.fechaFin >= ahora &&
      evento.cuposDisponibles > 0
  );
};

export const obtenerEventoPorId = async (eventoId: string): Promise<Evento | null> => {
  const eventoRef = ref(db, `eventos/${eventoId}`);
  const snapshot = await get(eventoRef);
  
  return snapshot.exists() ? snapshot.val() : null;
};

export const actualizarEvento = async (
  eventoId: string, 
  eventoData: Partial<FormularioEvento>,
  uid: string
): Promise<void> => {
  const eventoRef = ref(db, `eventos/${eventoId}`);
  
  const updates: any = {
    ...eventoData,
    ultimaModificacion: Date.now(),
    modificadoPor: uid,
  };
  
  if (eventoData.fechaInicio) {
    updates.fechaInicio = new Date(eventoData.fechaInicio).getTime();
  }
  if (eventoData.fechaFin) {
    updates.fechaFin = new Date(eventoData.fechaFin).getTime();
  }
  
  await update(eventoRef, updates);
};

export const eliminarEvento = async (eventoId: string): Promise<void> => {
  const eventoRef = ref(db, `eventos/${eventoId}`);
  await remove(eventoRef);
};

export const cambiarEstadoEvento = async (eventoId: string, estado: string): Promise<void> => {
  const eventoRef = ref(db, `eventos/${eventoId}`);
  await update(eventoRef, { estado });
};

// ========== INSCRIPCIONES ==========

export const inscribirseEvento = async (
  eventoId: string,
  empadronadoId: string,
  nombreEmpadronado: string,
  acompanantes: number = 0,
  observaciones?: string
): Promise<string> => {
  // Verificar cupos disponibles
  const evento = await obtenerEventoPorId(eventoId);
  if (!evento) throw new Error("Evento no encontrado");
  if (evento.cuposDisponibles < (1 + acompanantes)) {
    throw new Error("No hay cupos suficientes disponibles");
  }
  
  // Crear inscripción
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const nuevaInscripcionRef = push(inscripcionesRef);
  
  const inscripcion: InscripcionEvento = {
    id: nuevaInscripcionRef.key!,
    eventoId,
    empadronadoId,
    nombreEmpadronado,
    fechaInscripcion: Date.now(),
    estado: 'inscrito',
    acompanantes,
    observaciones,
    pagoRealizado: false,
  };
  
  await set(nuevaInscripcionRef, inscripcion);
  
  // Actualizar cupos disponibles
  const nuevosCupos = evento.cuposDisponibles - (1 + acompanantes);
  await update(ref(db, `eventos/${eventoId}`), {
    cuposDisponibles: nuevosCupos,
  });
  
  return nuevaInscripcionRef.key!;
};

export const obtenerInscripcionesPorEvento = async (eventoId: string): Promise<InscripcionEvento[]> => {
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const q = query(inscripcionesRef, orderByChild("eventoId"), equalTo(eventoId));
  const snapshot = await get(q);
  
  if (!snapshot.exists()) return [];
  
  const inscripciones: InscripcionEvento[] = [];
  snapshot.forEach((childSnapshot) => {
    inscripciones.push(childSnapshot.val());
  });
  
  return inscripciones.sort((a, b) => b.fechaInscripcion - a.fechaInscripcion);
};

export const obtenerInscripcionesPorEmpadronado = async (empadronadoId: string): Promise<InscripcionEvento[]> => {
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const q = query(inscripcionesRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snapshot = await get(q);
  
  if (!snapshot.exists()) return [];
  
  const inscripciones: InscripcionEvento[] = [];
  snapshot.forEach((childSnapshot) => {
    inscripciones.push(childSnapshot.val());
  });
  
  return inscripciones.sort((a, b) => b.fechaInscripcion - a.fechaInscripcion);
};

export const actualizarEstadoInscripcion = async (
  inscripcionId: string,
  estado: string
): Promise<void> => {
  const inscripcionRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
  await update(inscripcionRef, { estado });
};

export const registrarPagoInscripcion = async (
  inscripcionId: string,
  montoPagado: number
): Promise<void> => {
  const inscripcionRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
  await update(inscripcionRef, {
    pagoRealizado: true,
    fechaPago: Date.now(),
    montoPagado,
    estado: 'confirmado',
  });
};

export const cancelarInscripcion = async (inscripcionId: string, eventoId: string): Promise<void> => {
  const inscripcionRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
  const inscripcionSnapshot = await get(inscripcionRef);
  
  if (!inscripcionSnapshot.exists()) throw new Error("Inscripción no encontrada");
  
  const inscripcion = inscripcionSnapshot.val() as InscripcionEvento;
  
  // Cancelar inscripción
  await update(inscripcionRef, { estado: 'cancelado' });
  
  // Liberar cupos
  const eventoRef = ref(db, `eventos/${eventoId}`);
  const eventoSnapshot = await get(eventoRef);
  
  if (eventoSnapshot.exists()) {
    const evento = eventoSnapshot.val() as Evento;
    const cuposLiberados = 1 + inscripcion.acompanantes;
    await update(eventoRef, {
      cuposDisponibles: evento.cuposDisponibles + cuposLiberados,
    });
  }
};

// ========== ESTADÍSTICAS ==========

export const obtenerEstadisticasEventos = async (): Promise<EstadisticasEventos> => {
  const eventos = await obtenerEventos();
  const todasInscripciones: InscripcionEvento[] = [];
  
  // Obtener todas las inscripciones
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const snapshot = await get(inscripcionesRef);
  
  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      todasInscripciones.push(childSnapshot.val());
    });
  }
  
  const eventosActivos = eventos.filter(e => e.estado === 'activo');
  const inscripcionesConfirmadas = todasInscripciones.filter(i => i.pagoRealizado);
  const ingresosTotales = inscripcionesConfirmadas.reduce((sum, i) => sum + (i.montoPagado || 0), 0);
  
  // Evento más popular
  const inscripcionesPorEvento: Record<string, number> = {};
  todasInscripciones.forEach(i => {
    if (i.estado !== 'cancelado') {
      inscripcionesPorEvento[i.eventoId] = (inscripcionesPorEvento[i.eventoId] || 0) + 1;
    }
  });
  
  let eventoMasPopular;
  if (Object.keys(inscripcionesPorEvento).length > 0) {
    const eventoIdMasPopular = Object.entries(inscripcionesPorEvento)
      .sort(([, a], [, b]) => b - a)[0][0];
    const evento = eventos.find(e => e.id === eventoIdMasPopular);
    if (evento) {
      eventoMasPopular = {
        titulo: evento.titulo,
        inscritos: inscripcionesPorEvento[eventoIdMasPopular],
      };
    }
  }
  
  // Promedio de asistencia
  const eventosFinalizados = eventos.filter(e => e.estado === 'finalizado');
  const inscripcionesAsistio = todasInscripciones.filter(i => i.estado === 'asistio').length;
  const promedioAsistencia = eventosFinalizados.length > 0 
    ? (inscripcionesAsistio / eventosFinalizados.length) * 100 
    : 0;
  
  return {
    totalEventos: eventos.length,
    eventosActivos: eventosActivos.length,
    totalInscripciones: todasInscripciones.filter(i => i.estado !== 'cancelado').length,
    ingresosTotales,
    promedioAsistencia,
    eventoMasPopular,
  };
};
