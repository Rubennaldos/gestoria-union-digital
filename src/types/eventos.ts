// Tipos para el módulo de Eventos

export type CategoriaEvento = 'deportivo' | 'cultural' | 'educativo' | 'social' | 'recreativo' | 'otro';
export type EstadoEvento = 'activo' | 'inactivo' | 'finalizado' | 'cancelado';
export type EstadoInscripcion = 'inscrito' | 'confirmado' | 'cancelado' | 'asistio' | 'no_asistio';

export interface SesionEvento {
  id: string;
  lugar: string;
  fecha: number;
  horaInicio: string;
  horaFin: string;
}

export type TipoPromocion = 
  | 'codigo' 
  | 'acompanantes' 
  | 'early_bird' 
  | 'grupal' 
  | 'porcentaje'
  | 'custom';

export type TipoDescuento = 'fijo' | 'porcentaje' | 'escalonado' | 'por_paquete';

export interface EscalonPrecio {
  cantidadPersonas: number; // Cantidad total de personas (1 + acompañantes)
  precioPorPersona: number; // Precio por persona en este escalón
}

export interface PaqueteSesiones {
  cantidadSesiones: number; // Número de clases/sesiones
  precioTotal: number; // Precio total del paquete
  nombre?: string; // Ej: "Paquete Semanal", "Paquete Mensual"
}

export interface PromocionEvento {
  activa: boolean;
  tipo: TipoPromocion;
  nombre: string;
  descripcion?: string;
  
  // Para promoción por código
  codigo?: string;
  
  // Para descuentos
  tipoDescuento: TipoDescuento;
  montoDescuento?: number; // Monto fijo o porcentaje
  precioFinal?: number; // Precio final (alternativa al descuento)
  
  // Para precios escalonados por cantidad de personas
  escalones?: EscalonPrecio[];
  
  // Para paquetes de sesiones/días
  paquetes?: PaqueteSesiones[];
  
  // Para promoción por acompañantes
  minimoAcompanantes?: number;
  maximoAcompanantes?: number;
  
  // Para promoción early bird
  fechaVencimiento?: number;
  
  // Para promoción grupal
  minimoInscripciones?: number;
  
  // Para condiciones personalizadas
  condicionCustom?: string;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaEvento;
  fechaInicio: number;
  fechaFin?: number; // Opcional para eventos indefinidos
  fechaFinIndefinida: boolean;
  sesiones: SesionEvento[]; // Múltiples lugares y horarios
  instructor?: string;
  cuposMaximos?: number; // Opcional para sin límite
  cuposIlimitados: boolean;
  cuposDisponibles?: number;
  precio: number;
  promocion?: PromocionEvento;
  imagen?: string;
  requisitos?: string;
  materialesIncluidos?: string;
  estado: EstadoEvento;
  fechaCreacion: number;
  creadoPor: string;
  ultimaModificacion?: number;
  modificadoPor?: string;
}

export interface InscripcionEvento {
  id: string;
  eventoId: string;
  empadronadoId: string;
  nombreEmpadronado: string;
  fechaInscripcion: number;
  estado: EstadoInscripcion;
  acompanantes: number;
  observaciones?: string;
  pagoRealizado: boolean;
  fechaPago?: number;
  montoPagado?: number;
}

export interface FormularioEvento {
  titulo: string;
  descripcion: string;
  categoria: CategoriaEvento;
  fechaInicio: string;
  fechaFin?: string;
  fechaFinIndefinida: boolean;
  sesiones: Omit<SesionEvento, 'id'>[];
  instructor?: string;
  cuposMaximos?: number;
  cuposIlimitados: boolean;
  precio: number;
  promocion?: PromocionEvento;
  requisitos?: string;
  materialesIncluidos?: string;
  imagen?: string;
  estado: EstadoEvento;
}

export interface EstadisticasEventos {
  totalEventos: number;
  eventosActivos: number;
  totalInscripciones: number;
  ingresosTotales: number;
  promedioAsistencia: number;
  eventoMasPopular?: {
    titulo: string;
    inscritos: number;
  };
}
