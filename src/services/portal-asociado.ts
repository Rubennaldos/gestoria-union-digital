// Servicios para el Portal del Asociado usando Firebase RTDB
import { ref, push, set, get, query, orderByChild, equalTo, orderByKey, limitToLast, update, remove } from "firebase/database";
import { db } from "@/config/firebase";
import {
  RegistroVisita,
  CreateVisitaForm,
  SeguimientoPago,
  ResumenDeuda,
  PreguntaFrecuente,
  CategoriaPregunta,
  Producto,
  CategoriaProducto,
  Pedido,
  CreatePedidoForm,
  Sugerencia,
  CreateSugerenciaForm,
  Evento,
  InscripcionEvento,
  CreateInscripcionForm,
  EstadisticasPortal
} from "@/types/portal-asociado";

/* ──────────────────────────────────────────────────────────
   Registro de Visitas
   ────────────────────────────────────────────────────────── */

export const crearRegistroVisita = async (
  empadronadoId: string,
  visitaData: CreateVisitaForm
): Promise<string> => {
  const visitasRef = ref(db, 'portal/visitas');
  const newVisitaRef = push(visitasRef);
  
  const visita: Omit<RegistroVisita, 'id'> = {
    empadronadoId,
    ...visitaData,
    autorizado: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await set(newVisitaRef, visita);
  return newVisitaRef.key!;
};

export const obtenerVisitasEmpadronado = async (empadronadoId: string): Promise<RegistroVisita[]> => {
  const visitasRef = ref(db, 'portal/visitas');
  const visitasQuery = query(visitasRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const snapshot = await get(visitasQuery);
  
  if (!snapshot.exists()) return [];
  
  const visitas: RegistroVisita[] = [];
  snapshot.forEach((child) => {
    visitas.push({
      id: child.key!,
      ...child.val()
    });
  });
  
  return visitas.sort((a, b) => b.fechaIngreso - a.fechaIngreso);
};

export const autorizarVisita = async (visitaId: string, autorizadoPor: string): Promise<void> => {
  const visitaRef = ref(db, `portal/visitas/${visitaId}`);
  await update(visitaRef, {
    autorizado: true,
    autorizadoPor,
    updatedAt: Date.now()
  });
};

export const registrarSalidaVisita = async (visitaId: string): Promise<void> => {
  const visitaRef = ref(db, `portal/visitas/${visitaId}`);
  await update(visitaRef, {
    fechaSalida: Date.now(),
    updatedAt: Date.now()
  });
};

/* ──────────────────────────────────────────────────────────
   Seguimiento de Pagos (integrado con cobranzas)
   ────────────────────────────────────────────────────────── */

export const obtenerSeguimientoPagos = async (empadronadoId: string): Promise<SeguimientoPago[]> => {
  // Obtener los cargos del empadronado desde el módulo de cobranzas
  const cargosRef = ref(db, 'cobranzas/cargos');
  const cargosQuery = query(cargosRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const cargosSnapshot = await get(cargosQuery);
  
  if (!cargosSnapshot.exists()) return [];
  
  const seguimientos: SeguimientoPago[] = [];
  cargosSnapshot.forEach((child) => {
    const cargo = child.val();
    seguimientos.push({
      periodo: cargo.periodo,
      monto: cargo.monto,
      fechaVencimiento: cargo.fechaVencimiento,
      fechaPago: cargo.fechaPago,
      metodoPago: cargo.metodoPago,
      estado: cargo.estado,
      recargo: cargo.recargo || 0,
      descuento: cargo.descuento || 0,
      observaciones: cargo.observaciones
    });
  });
  
  return seguimientos.sort((a, b) => b.fechaVencimiento - a.fechaVencimiento);
};

export const obtenerResumenDeuda = async (empadronadoId: string): Promise<ResumenDeuda> => {
  const pagos = await obtenerSeguimientoPagos(empadronadoId);
  const ahora = Date.now();
  
  const pendientes = pagos.filter(p => p.estado === 'pendiente');
  const vencidos = pagos.filter(p => p.estado === 'vencido' || (p.estado === 'pendiente' && p.fechaVencimiento < ahora));
  const recientes = pagos.filter(p => p.estado === 'pagado').slice(0, 5);
  
  const totalPendiente = pendientes.reduce((sum, p) => sum + p.monto + (p.recargo || 0) - (p.descuento || 0), 0);
  const totalVencido = vencidos.reduce((sum, p) => sum + p.monto + (p.recargo || 0) - (p.descuento || 0), 0);
  
  const proximoPendiente = pendientes
    .filter(p => p.fechaVencimiento > ahora)
    .sort((a, b) => a.fechaVencimiento - b.fechaVencimiento)[0];
  
  return {
    totalPendiente,
    totalVencido,
    proximoVencimiento: proximoPendiente ? {
      periodo: proximoPendiente.periodo,
      monto: proximoPendiente.monto,
      fecha: proximoPendiente.fechaVencimiento
    } : undefined,
    pagosRecientes: recientes
  };
};

/* ──────────────────────────────────────────────────────────
   Preguntas Frecuentes
   ────────────────────────────────────────────────────────── */

export const obtenerPreguntasFrecuentes = async (): Promise<PreguntaFrecuente[]> => {
  const preguntasRef = ref(db, 'portal/preguntas-frecuentes');
  const snapshot = await get(preguntasRef);
  
  if (!snapshot.exists()) return [];
  
  const preguntas: PreguntaFrecuente[] = [];
  snapshot.forEach((child) => {
    const pregunta = child.val();
    if (pregunta.activo) {
      preguntas.push({
        id: child.key!,
        ...pregunta
      });
    }
  });
  
  return preguntas.sort((a, b) => a.orden - b.orden);
};

export const obtenerCategoriasPregunta = async (): Promise<CategoriaPregunta[]> => {
  const categoriasRef = ref(db, 'portal/categorias-pregunta');
  const snapshot = await get(categoriasRef);
  
  if (!snapshot.exists()) return [];
  
  const categorias: CategoriaPregunta[] = [];
  snapshot.forEach((child) => {
    const categoria = child.val();
    if (categoria.activo) {
      categorias.push({
        id: child.key!,
        ...categoria
      });
    }
  });
  
  return categorias.sort((a, b) => a.orden - b.orden);
};

/* ──────────────────────────────────────────────────────────
   Ecommerce - Productos y Servicios
   ────────────────────────────────────────────────────────── */

export const obtenerProductos = async (): Promise<Producto[]> => {
  const productosRef = ref(db, 'portal/productos');
  const snapshot = await get(productosRef);
  
  if (!snapshot.exists()) return [];
  
  const productos: Producto[] = [];
  snapshot.forEach((child) => {
    const producto = child.val();
    if (producto.activo && producto.stock > 0) {
      productos.push({
        id: child.key!,
        ...producto
      });
    }
  });
  
  return productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
};

export const obtenerCategoriasProducto = async (): Promise<CategoriaProducto[]> => {
  const categoriasRef = ref(db, 'portal/categorias-producto');
  const snapshot = await get(categoriasRef);
  
  if (!snapshot.exists()) return [];
  
  const categorias: CategoriaProducto[] = [];
  snapshot.forEach((child) => {
    const categoria = child.val();
    if (categoria.activo) {
      categorias.push({
        id: child.key!,
        ...categoria
      });
    }
  });
  
  return categorias.sort((a, b) => a.orden - b.orden);
};

export const crearPedido = async (
  empadronadoId: string,
  pedidoData: CreatePedidoForm
): Promise<string> => {
  const pedidosRef = ref(db, 'portal/pedidos');
  const newPedidoRef = push(pedidosRef);
  
  const total = pedidoData.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  
  const pedido: Omit<Pedido, 'id'> = {
    empadronadoId,
    ...pedidoData,
    total,
    estado: 'pendiente',
    fechaPedido: Date.now()
  };

  await set(newPedidoRef, pedido);
  return newPedidoRef.key!;
};

export const obtenerPedidosEmpadronado = async (empadronadoId: string): Promise<Pedido[]> => {
  const pedidosRef = ref(db, 'portal/pedidos');
  const pedidosQuery = query(pedidosRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const snapshot = await get(pedidosQuery);
  
  if (!snapshot.exists()) return [];
  
  const pedidos: Pedido[] = [];
  snapshot.forEach((child) => {
    pedidos.push({
      id: child.key!,
      ...child.val()
    });
  });
  
  return pedidos.sort((a, b) => b.fechaPedido - a.fechaPedido);
};

/* ──────────────────────────────────────────────────────────
   Sugerencias
   ────────────────────────────────────────────────────────── */

export const crearSugerencia = async (
  empadronadoId: string,
  sugerenciaData: CreateSugerenciaForm
): Promise<string> => {
  const sugerenciasRef = ref(db, 'portal/sugerencias');
  const newSugerenciaRef = push(sugerenciasRef);
  
  const sugerencia: Omit<Sugerencia, 'id'> = {
    empadronadoId,
    ...sugerenciaData,
    estado: 'pendiente',
    fechaCreacion: Date.now(),
    fechaActualizacion: Date.now()
  };

  await set(newSugerenciaRef, sugerencia);
  return newSugerenciaRef.key!;
};

export const obtenerSugerenciasEmpadronado = async (empadronadoId: string): Promise<Sugerencia[]> => {
  const sugerenciasRef = ref(db, 'portal/sugerencias');
  const sugerenciasQuery = query(sugerenciasRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const snapshot = await get(sugerenciasQuery);
  
  if (!snapshot.exists()) return [];
  
  const sugerencias: Sugerencia[] = [];
  snapshot.forEach((child) => {
    sugerencias.push({
      id: child.key!,
      ...child.val()
    });
  });
  
  return sugerencias.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
};

/* ──────────────────────────────────────────────────────────
   Eventos
   ────────────────────────────────────────────────────────── */

export const obtenerEventos = async (): Promise<Evento[]> => {
  const eventosRef = ref(db, 'portal/eventos');
  const snapshot = await get(eventosRef);
  
  if (!snapshot.exists()) return [];
  
  const eventos: Evento[] = [];
  const ahora = Date.now();
  
  snapshot.forEach((child) => {
    const evento = child.val();
    if (evento.activo && evento.fechaFin > ahora) {
      eventos.push({
        id: child.key!,
        ...evento
      });
    }
  });
  
  return eventos.sort((a, b) => a.fechaInicio - b.fechaInicio);
};

export const inscribirseEvento = async (
  eventoId: string,
  empadronadoId: string,
  inscripcionData: CreateInscripcionForm
): Promise<string> => {
  const inscripcionesRef = ref(db, 'portal/inscripciones-eventos');
  const newInscripcionRef = push(inscripcionesRef);
  
  const inscripcion: Omit<InscripcionEvento, 'id'> = {
    eventoId,
    empadronadoId,
    ...inscripcionData,
    fechaInscripcion: Date.now(),
    estado: 'inscrito'
  };

  await set(newInscripcionRef, inscripcion);
  return newInscripcionRef.key!;
};

export const obtenerInscripcionesEmpadronado = async (empadronadoId: string): Promise<InscripcionEvento[]> => {
  const inscripcionesRef = ref(db, 'portal/inscripciones-eventos');
  const inscripcionesQuery = query(inscripcionesRef, orderByChild('empadronadoId'), equalTo(empadronadoId));
  const snapshot = await get(inscripcionesQuery);
  
  if (!snapshot.exists()) return [];
  
  const inscripciones: InscripcionEvento[] = [];
  snapshot.forEach((child) => {
    inscripciones.push({
      id: child.key!,
      ...child.val()
    });
  });
  
  return inscripciones.sort((a, b) => b.fechaInscripcion - a.fechaInscripcion);
};

/* ──────────────────────────────────────────────────────────
   Estadísticas
   ────────────────────────────────────────────────────────── */

export const obtenerEstadisticasPortal = async (): Promise<EstadisticasPortal> => {
  const ahora = Date.now();
  const inicioDelDia = new Date();
  inicioDelDia.setHours(0, 0, 0, 0);
  
  // Obtener todas las referencias necesarias
  const [visitasSnapshot, sugerenciasSnapshot, pedidosSnapshot, eventosSnapshot, inscripcionesSnapshot] = await Promise.all([
    get(ref(db, 'portal/visitas')),
    get(ref(db, 'portal/sugerencias')),
    get(ref(db, 'portal/pedidos')),
    get(ref(db, 'portal/eventos')),
    get(ref(db, 'portal/inscripciones-eventos'))
  ]);
  
  let totalVisitas = 0;
  let visitasHoy = 0;
  
  if (visitasSnapshot.exists()) {
    visitasSnapshot.forEach((child) => {
      const visita = child.val();
      totalVisitas++;
      if (visita.fechaIngreso >= inicioDelDia.getTime()) {
        visitasHoy++;
      }
    });
  }
  
  let totalSugerencias = 0;
  let sugerenciasPendientes = 0;
  
  if (sugerenciasSnapshot.exists()) {
    sugerenciasSnapshot.forEach((child) => {
      const sugerencia = child.val();
      totalSugerencias++;
      if (sugerencia.estado === 'pendiente') {
        sugerenciasPendientes++;
      }
    });
  }
  
  let totalPedidos = 0;
  let pedidosActivos = 0;
  
  if (pedidosSnapshot.exists()) {
    pedidosSnapshot.forEach((child) => {
      const pedido = child.val();
      totalPedidos++;
      if (['pendiente', 'confirmado', 'preparando', 'listo'].includes(pedido.estado)) {
        pedidosActivos++;
      }
    });
  }
  
  let eventosProximos = 0;
  
  if (eventosSnapshot.exists()) {
    eventosSnapshot.forEach((child) => {
      const evento = child.val();
      if (evento.activo && evento.fechaFin > ahora) {
        eventosProximos++;
      }
    });
  }
  
  let inscripcionesEventos = 0;
  
  if (inscripcionesSnapshot.exists()) {
    inscripcionesSnapshot.forEach((child) => {
      const inscripcion = child.val();
      if (inscripcion.estado === 'inscrito' || inscripcion.estado === 'confirmado') {
        inscripcionesEventos++;
      }
    });
  }
  
  return {
    totalVisitas,
    visitasHoy,
    totalSugerencias,
    sugerenciasPendientes,
    totalPedidos,
    pedidosActivos,
    eventosProximos,
    inscripcionesEventos
  };
};