// Tipos para el módulo de Eventos

export type CategoriaEvento = 'deportivo' | 'cultural' | 'educativo' | 'social' | 'recreativo' | 'otro';
export type EstadoEvento = 'activo' | 'inactivo' | 'finalizado' | 'cancelado';
export type EstadoInscripcion = 'inscrito' | 'confirmado' | 'cancelado' | 'asistio' | 'no_asistio';

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: CategoriaEvento;
  fechaInicio: number;
  fechaFin: number;
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  lugar: string;
  instructor?: string; // Profesor/instructor del evento
  cuposMaximos: number;
  cuposDisponibles: number;
  precio: number;
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
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  instructor?: string;
  cuposMaximos: number;
  precio: number;
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
