// src/services/eventos.ts
import {
  ref,
  push,
  get,
  set,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "@/config/firebase";
import {
  Evento,
  InscripcionEvento,
  FormularioEvento,
  EstadisticasEventos,
  SesionEvento,
} from "@/types/eventos";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const zonedTimeToUtc = fromZonedTime; // alias
const utcToZonedTime = toZonedTime; // alias

// ========== EVENTOS ==========

export const crearEvento = async (
  eventoData: FormularioEvento,
  uid: string
): Promise<string> => {
  const eventosRef = ref(db, "eventos");
  const nuevoEventoRef = push(eventosRef);

  // Agregar IDs a las sesiones
  const sesionesConId: SesionEvento[] = eventoData.sesiones.map(
    (sesion, index) => ({
      ...sesion,
      id: `${nuevoEventoRef.key}_sesion_${index}`,
    })
  );

  // Fechas en zona horaria Perú -> UTC
  const TIMEZONE = "America/Lima";
  const fechaInicioPeruana = zonedTimeToUtc(eventoData.fechaInicio, TIMEZONE);
  const fechaFinPeruana =
    eventoData.fechaFin && !eventoData.fechaFinIndefinida
      ? zonedTimeToUtc(eventoData.fechaFin, TIMEZONE)
      : null;

  const evento: Evento = {
    id: nuevoEventoRef.key!,
    titulo: eventoData.titulo,
    descripcion: eventoData.descripcion,
    categoria: eventoData.categoria,
    fechaInicio: fechaInicioPeruana.getTime(),
    fechaFin: fechaFinPeruana ? fechaFinPeruana.getTime() : null,
    fechaFinIndefinida: eventoData.fechaFinIndefinida,
    sesiones: sesionesConId,
    instructor: eventoData.instructor,
    cuposMaximos: eventoData.cuposIlimitados ? null : eventoData.cuposMaximos,
    cuposIlimitados: eventoData.cuposIlimitados,
    cuposDisponibles: eventoData.cuposIlimitados
      ? null
      : eventoData.cuposMaximos,
    precio: eventoData.precio,
    ...(eventoData.promocion && { promocion: eventoData.promocion }),
    imagen: eventoData.imagen,
    requisitos: eventoData.requisitos,
    materialesIncluidos: eventoData.materialesIncluidos,
    estado: eventoData.estado,
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
  snapshot.forEach((child) => {
    eventos.push(child.val());
  });
  return eventos.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
};

export const obtenerEventosActivos = async (): Promise<Evento[]> => {
  const eventos = await obtenerEventos();
  const ahora = Date.now();
  return eventos.filter(
    (e) =>
      e.estado === "activo" &&
      (e.fechaFinIndefinida || !e.fechaFin || e.fechaFin >= ahora) &&
      (e.cuposIlimitados ||
        (typeof e.cuposDisponibles === "number" && e.cuposDisponibles > 0))
  );
};

export const obtenerEventoPorId = async (
  eventoId: string
): Promise<Evento | null> => {
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

  const updates: Record<string, any> = {
    ultimaModificacion: Date.now(),
    modificadoPor: uid,
  };

  if (eventoData.titulo !== undefined) updates.titulo = eventoData.titulo;
  if (eventoData.descripcion !== undefined)
    updates.descripcion = eventoData.descripcion;
  if (eventoData.categoria !== undefined) updates.categoria = eventoData.categoria;
  if (eventoData.instructor !== undefined)
    updates.instructor = eventoData.instructor;
  if (eventoData.precio !== undefined) updates.precio = eventoData.precio;
  if (eventoData.requisitos !== undefined)
    updates.requisitos = eventoData.requisitos;
  if (eventoData.materialesIncluidos !== undefined)
    updates.materialesIncluidos = eventoData.materialesIncluidos;
  if (eventoData.imagen !== undefined) updates.imagen = eventoData.imagen;
  if (eventoData.estado !== undefined) updates.estado = eventoData.estado;

  if (eventoData.promocion) {
    // limpiar undefined para RTDB
    updates.promocion = JSON.parse(JSON.stringify(eventoData.promocion));
  }

  if (eventoData.fechaFinIndefinida !== undefined) {
    updates.fechaFinIndefinida = eventoData.fechaFinIndefinida;
  }

  if (eventoData.cuposIlimitados !== undefined) {
    updates.cuposIlimitados = eventoData.cuposIlimitados;
    if (eventoData.cuposIlimitados) {
      updates.cuposMaximos = null;
      updates.cuposDisponibles = null;
    } else if (eventoData.cuposMaximos !== undefined) {
      updates.cuposMaximos = eventoData.cuposMaximos;
    }
  }

  if (eventoData.sesiones !== undefined) {
    const sesionesConId: SesionEvento[] = eventoData.sesiones.map(
      (s, i) => ({ ...s, id: `${eventoId}_sesion_${i}` })
    );
    updates.sesiones = sesionesConId;
  }

  const TIMEZONE = "America/Lima";
  if (eventoData.fechaInicio) {
    const f = zonedTimeToUtc(eventoData.fechaInicio, TIMEZONE);
    updates.fechaInicio = f.getTime();
  }
  if (eventoData.fechaFin && !eventoData.fechaFinIndefinida) {
    const f = zonedTimeToUtc(eventoData.fechaFin, TIMEZONE);
    updates.fechaFin = f.getTime();
  } else if (eventoData.fechaFinIndefinida) {
    updates.fechaFin = null;
  }

  await update(eventoRef, updates);
};

export const eliminarEvento = async (eventoId: string): Promise<void> => {
  await remove(ref(db, `eventos/${eventoId}`));
};

export const cambiarEstadoEvento = async (
  eventoId: string,
  estado: string
): Promise<void> => {
  await update(ref(db, `eventos/${eventoId}`), { estado });
};

// ========== INSCRIPCIONES ==========

export const inscribirseEvento = async (
  eventoId: string,
  empadronadoId: string,
  nombreEmpadronado: string,
  acompanantes: number = 0,
  observaciones?: string
): Promise<string> => {
  const evento = await obtenerEventoPorId(eventoId);
  if (!evento) throw new Error("Evento no encontrado");

  if (!evento.cuposIlimitados && typeof evento.cuposDisponibles === "number") {
    if (evento.cuposDisponibles < 1 + acompanantes) {
      throw new Error("No hay cupos suficientes disponibles");
    }
  }

  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const nuevaInscripcionRef = push(inscripcionesRef);

  const inscripcion: InscripcionEvento = {
    id: nuevaInscripcionRef.key!,
    eventoId,
    empadronadoId,
    nombreEmpadronado,
    fechaInscripcion: Date.now(),
    estado: "inscrito",
    acompanantes,
    observaciones,
    pagoRealizado: false,
  };

  await set(nuevaInscripcionRef, inscripcion);

  if (!evento.cuposIlimitados && typeof evento.cuposDisponibles === "number") {
    const nuevosCupos = evento.cuposDisponibles - (1 + acompanantes);
    await update(ref(db, `eventos/${eventoId}`), { cuposDisponibles: nuevosCupos });
  }

  return nuevaInscripcionRef.key!;
};

export const obtenerInscripcionesPorEvento = async (
  eventoId: string
): Promise<InscripcionEvento[]> => {
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const snapshot = await get(inscripcionesRef);
  if (!snapshot.exists()) return [];

  const list: InscripcionEvento[] = [];
  snapshot.forEach((c) => {
    const v = c.val();
    if (v.eventoId === eventoId) list.push(v);
  });

  return list.sort((a, b) => b.fechaInscripcion - a.fechaInscripcion);
};

export const obtenerInscripcionesPorEmpadronado = async (
  empadronadoId: string
): Promise<InscripcionEvento[]> => {
  const inscripcionesRef = ref(db, "inscripcionesEventos");
  const snapshot = await get(inscripcionesRef);
  if (!snapshot.exists()) return [];

  const list: InscripcionEvento[] = [];
  snapshot.forEach((c) => {
    const v = c.val();
    if (v.empadronadoId === empadronadoId) list.push(v);
  });

  return list.sort((a, b) => b.fechaInscripcion - a.fechaInscripcion);
};

export const actualizarEstadoInscripcion = async (
  inscripcionId: string,
  estado: string
): Promise<void> => {
  await update(ref(db, `inscripcionesEventos/${inscripcionId}`), { estado });
};

/** Registra pago y genera comprobante (fan-out a cobranzas_v2) */
export const registrarPagoInscripcion = async (
  inscripcionId: string,
  montoPagado: number
): Promise<{ receiptId: string; receiptCode: string }> => {
  // leer inscripción y evento
  const insRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
  const insSnap = await get(insRef);
  if (!insSnap.exists()) throw new Error("Inscripción no encontrada");
  const ins = insSnap.val() as InscripcionEvento;

  const evento = await obtenerEventoPorId(ins.eventoId);
  if (!evento) throw new Error("Evento no encontrado");

  // correlativo
  async function getNextReceiptCode(): Promise<string> {
    const cRef = ref(db, "correlatives/receipt");
    const cSnap = await get(cRef);
    let prefix = "REC-2025";
    let next = 1;
    let pad = 6;
    if (cSnap.exists()) {
      const v = cSnap.val() as any;
      prefix = v.prefix ?? prefix;
      next = Number(v.next ?? 1);
      pad = Number(v.pad ?? 6);
    }
    const code = `${prefix}-${String(next).padStart(pad, "0")}`;
    await set(cRef, { prefix, next: next + 1, pad, updatedAt: Date.now() });
    return code;
  }

  const receiptCode = await getNextReceiptCode();

  const issuedAt = Date.now();
  const items = [
    {
      description: `Inscripción a '${evento.titulo}'`,
      qty: 1,
      unitPrice: evento.precio ?? montoPagado,
      subtotal: montoPagado,
    },
  ];

  const receiptRef = push(ref(db, "receipts"));
  const receiptId = receiptRef.key!;

  const updates: Record<string, any> = {};
  updates[`receipts/${receiptId}`] = {
    id: receiptId,
    code: receiptCode,
    issuedAt,
    org: {
      name: "Asociación Junta de Propietarios San Antonio de Pachacamac",
      logoPath: "/logo-san-antonio.png",
    },
    customer: {
      empadronadoId: ins.empadronadoId,
      name: ins.nombreEmpadronado,
    },
    event: {
      id: evento.id,
      name: evento.titulo,
      date: evento.fechaInicio
        ? new Date(evento.fechaInicio).toISOString()
        : undefined,
    },
    items,
    total: montoPagado,
    currency: "PEN" as const,
    paymentMethod: "transferencia" as const,
    notes: null as string | null,
    inscripcionId,
  };

  updates[`inscripcionesEventos/${inscripcionId}/pagoRealizado`] = true;
  updates[`inscripcionesEventos/${inscripcionId}/fechaPago`] = issuedAt;
  updates[`inscripcionesEventos/${inscripcionId}/montoPagado`] = montoPagado;
  updates[`inscripcionesEventos/${inscripcionId}/estado`] = "confirmado";
  updates[`inscripcionesEventos/${inscripcionId}/comprobanteId`] = receiptId;

  updates[`cobranzas_v2/comprobantes/${ins.empadronadoId}/${receiptId}`] = {
    ref: `/receipts/${receiptId}`,
    code: receiptCode,
    customerName: ins.nombreEmpadronado,
    eventName: evento.titulo,
    total: montoPagado,
    issuedAt,
    tipo: "evento",
  };

  updates[`receipts_by_inscripcion/${inscripcionId}`] = receiptId;

  await update(ref(db), updates);
  return { receiptId, receiptCode };
};

export const cancelarInscripcion = async (
  inscripcionId: string,
  eventoId: string
): Promise<void> => {
  const insRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
  const insSnap = await get(insRef);
  if (!insSnap.exists()) throw new Error("Inscripción no encontrada");
  const ins = insSnap.val() as InscripcionEvento;

  await update(insRef, { estado: "cancelado" });

  const eventoRef = ref(db, `eventos/${eventoId}`);
  const eventoSnap = await get(eventoRef);
  if (eventoSnap.exists()) {
    const evento = eventoSnap.val() as Evento;
    if (!evento.cuposIlimitados && typeof evento.cuposDisponibles === "number") {
      const cuposLiberados = 1 + ins.acompanantes;
      await update(eventoRef, {
        cuposDisponibles: evento.cuposDisponibles + cuposLiberados,
      });
    }
  }
};

// ========== ESTADÍSTICAS ==========

export const obtenerEstadisticasEventos = async (): Promise<EstadisticasEventos> => {
  const eventos = await obtenerEventos();
  const todasInscripciones: InscripcionEvento[] = [];

  const snap = await get(ref(db, "inscripcionesEventos"));
  if (snap.exists()) {
    snap.forEach((c) => {
      todasInscripciones.push(c.val());
    });
  }

  const eventosActivos = eventos.filter((e) => e.estado === "activo");
  const inscripcionesConfirmadas = todasInscripciones.filter(
    (i) => i.pagoRealizado
  );
  const ingresosTotales = inscripcionesConfirmadas.reduce(
    (s, i) => s + (i.montoPagado || 0),
    0
  );

  // Evento más popular
  const inscripcionesPorEvento: Record<string, number> = {};
  todasInscripciones.forEach((i) => {
    if (i.estado !== "cancelado") {
      inscripcionesPorEvento[i.eventoId] =
        (inscripcionesPorEvento[i.eventoId] || 0) + 1;
    }
  });

  let eventoMasPopular: { titulo: string; inscritos: number } | undefined;
  if (Object.keys(inscripcionesPorEvento).length > 0) {
    const eventoIdMasPopular = Object.entries(inscripcionesPorEvento).sort(
      ([, a], [, b]) => b - a
    )[0][0];
    const ev = eventos.find((e) => e.id === eventoIdMasPopular);
    if (ev) {
      eventoMasPopular = {
        titulo: ev.titulo,
        inscritos: inscripcionesPorEvento[eventoIdMasPopular],
      };
    }
  }

  // Promedio de asistencia
  const eventosFinalizados = eventos.filter((e) => e.estado === "finalizado");
  const inscripcionesAsistio = todasInscripciones.filter(
    (i) => i.estado === "asistio"
  ).length;
  const promedioAsistencia =
    eventosFinalizados.length > 0
      ? (inscripcionesAsistio / eventosFinalizados.length) * 100
      : 0;

  return {
    totalEventos: eventos.length,
    eventosActivos: eventosActivos.length,
    totalInscripciones: todasInscripciones.filter(
      (i) => i.estado !== "cancelado"
    ).length,
    ingresosTotales,
    promedioAsistencia,
    eventoMasPopular,
  };
};
