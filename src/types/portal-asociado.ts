// Tipos para el Portal del Asociado

/* ──────────────────────────────────────────────────────────
   Registro de Visitas
   ────────────────────────────────────────────────────────── */
export interface RegistroVisita {
  id: string;
  empadronadoId: string;
  visitanteNombre: string;
  visitanteDni?: string;
  visitanteTelefono?: string;
  motivoVisita: string;
  fechaIngreso: number;
  fechaSalida?: number;
  observaciones?: string;
  autorizado: boolean;
  autorizadoPor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateVisitaForm {
  visitanteNombre: string;
  visitanteDni?: string;
  visitanteTelefono?: string;
  motivoVisita: string;
  fechaIngreso: number;
  observaciones?: string;
}

/* ──────────────────────────────────────────────────────────
   Seguimiento de Pagos (solo lectura)
   ────────────────────────────────────────────────────────── */
export interface SeguimientoPago {
  periodo: string;
  monto: number;
  fechaVencimiento: number;
  fechaPago?: number;
  metodoPago?: string;
  estado: 'pendiente' | 'pagado' | 'vencido';
  recargo?: number;
  descuento?: number;
  observaciones?: string;
}

export interface ResumenDeuda {
  totalPendiente: number;
  totalVencido: number;
  proximoVencimiento?: {
    periodo: string;
    monto: number;
    fecha: number;
  };
  pagosRecientes: SeguimientoPago[];
}

/* ──────────────────────────────────────────────────────────
   Preguntas Frecuentes
   ────────────────────────────────────────────────────────── */
export interface PreguntaFrecuente {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
  orden: number;
  activo: boolean;
  fechaCreacion: number;
  fechaActualizacion: number;
  creadoPor: string;
}

export interface CategoriaPregunta {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

/* ──────────────────────────────────────────────────────────
   Ecommerce - Productos y Servicios
   ────────────────────────────────────────────────────────── */
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagenes: string[];
  stock: number;
  activo: boolean;
  fechaCreacion: number;
  fechaActualizacion: number;
  creadoPor: string;
}

export interface CategoriaProducto {
  id: string;
  nombre: string;
  descripcion?: string;
  imagen?: string;
  orden: number;
  activo: boolean;
}

export interface CarritoItem {
  productoId: string;
  cantidad: number;
  precio: number;
}

export interface Pedido {
  id: string;
  empadronadoId: string;
  items: CarritoItem[];
  total: number;
  estado: 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  fechaPedido: number;
  fechaEntrega?: number;
  observaciones?: string;
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  comprobantePago?: string;
}

export interface CreatePedidoForm {
  items: CarritoItem[];
  observaciones?: string;
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  comprobantePago?: string;
}

/* ──────────────────────────────────────────────────────────
   Sugerencias
   ────────────────────────────────────────────────────────── */
export interface Sugerencia {
  id: string;
  empadronadoId: string;
  titulo: string;
  descripcion: string;
  categoria: 'mejora' | 'queja' | 'propuesta' | 'consulta' | 'otro';
  prioridad: 'baja' | 'media' | 'alta';
  estado: 'pendiente' | 'en_revision' | 'en_proceso' | 'resuelto' | 'cerrado';
  fechaCreacion: number;
  fechaActualizacion: number;
  respuesta?: string;
  respondidoPor?: string;
  fechaRespuesta?: number;
  anonima: boolean;
}

export interface CreateSugerenciaForm {
  titulo: string;
  descripcion: string;
  categoria: 'mejora' | 'queja' | 'propuesta' | 'consulta' | 'otro';
  prioridad: 'baja' | 'media' | 'alta';
  anonima: boolean;
}

/* ──────────────────────────────────────────────────────────
   Eventos
   ────────────────────────────────────────────────────────── */
export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: number;
  fechaFin: number;
  lugar: string;
  categoria: 'asamblea' | 'reunion' | 'actividad' | 'celebracion' | 'otro';
  capacidadMaxima?: number;
  requiereInscripcion: boolean;
  costo?: number;
  imagen?: string;
  activo: boolean;
  fechaCreacion: number;
  creadoPor: string;
}

export interface InscripcionEvento {
  id: string;
  eventoId: string;
  empadronadoId: string;
  fechaInscripcion: number;
  acompanantes?: number;
  observaciones?: string;
  estado: 'inscrito' | 'confirmado' | 'cancelado';
}

export interface CreateInscripcionForm {
  acompanantes?: number;
  observaciones?: string;
}

/* ──────────────────────────────────────────────────────────
   Estadísticas del Portal
   ────────────────────────────────────────────────────────── */
export interface EstadisticasPortal {
  totalVisitas: number;
  visitasHoy: number;
  totalSugerencias: number;
  sugerenciasPendientes: number;
  totalPedidos: number;
  pedidosActivos: number;
  eventosProximos: number;
  inscripcionesEventos: number;
}