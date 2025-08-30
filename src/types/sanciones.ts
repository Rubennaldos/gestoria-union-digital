export type TipoEntidad = 
  | 'empadronado'
  | 'maestro_obra'
  | 'direccion'
  | 'vehiculo'
  | 'negocio'
  | 'delegado'
  | 'junta_directiva';

export type TipoSancion = 
  | 'amonestacion'
  | 'multa'
  | 'suspension_temporal'
  | 'suspension_permanente'
  | 'inhabilitacion'
  | 'otros';

export type EstadoSancion = 
  | 'activa'
  | 'cumplida'
  | 'anulada'
  | 'en_proceso';

export interface Sancion {
  id: string;
  numeroSancion: string;
  tipoEntidad: TipoEntidad;
  entidadId: string;
  entidadNombre: string;
  entidadDocumento?: string; // DNI, RUC, placa, etc.
  tipoSancion: TipoSancion;
  motivo: string;
  descripcion: string;
  montoMulta?: number;
  fechaAplicacion: string; // ISO date
  fechaVencimiento?: string; // ISO date
  estado: EstadoSancion;
  aplicadoPor: string; // uid del fiscal/presidente
  aplicadoPorNombre: string;
  documentoSancion?: string; // URL del documento firmado
  resolucion?: string; // Número de resolución
  observaciones?: string;
  fechaCumplimiento?: string; // ISO date
  cumplidoPor?: string; // uid de quien marcó como cumplida
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface CreateSancionForm {
  tipoEntidad: TipoEntidad;
  entidadId: string;
  entidadNombre: string;
  entidadDocumento?: string;
  tipoSancion: TipoSancion;
  motivo: string;
  descripcion: string;
  montoMulta?: number;
  fechaVencimiento?: string;
  resolucion?: string;
  observaciones?: string;
}

export interface UpdateSancionForm extends Partial<CreateSancionForm> {
  estado?: EstadoSancion;
  fechaCumplimiento?: string;
}

export interface SancionesStats {
  total: number;
  activas: number;
  cumplidas: number;
  anuladas: number;
  enProceso: number;
  porTipoEntidad: Record<TipoEntidad, number>;
  montoTotalMultas: number;
  montoMultasPendientes: number;
}

export interface SancionFilters {
  tipoEntidad?: TipoEntidad;
  tipoSancion?: TipoSancion;
  estado?: EstadoSancion;
  fechaDesde?: string;
  fechaHasta?: string;
  search?: string;
}

// Entidades sancionables
export interface EmpadronadoSancionable {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  numeroPadron: string;
  manzana?: string;
  lote?: string;
  etapa?: string;
}

export interface MaestroObraSancionable {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  licencia?: string;
  telefono?: string;
}

export interface DireccionSancionable {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  cargo: string;
  periodo: string;
}

export interface VehiculoSancionable {
  id: string;
  placa: string;
  tipo: 'vehiculo' | 'moto';
  propietario: string;
  propietarioDni: string;
}

export interface NegocioSancionable {
  id: string;
  nombre: string;
  ruc?: string;
  propietario: string;
  propietarioDni: string;
  direccion: string;
}

export interface DelegadoSancionable {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  etapaAsignada: string;
  telefono?: string;
}

export interface JuntaDirectivaSancionable {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  cargo: string;
  periodo: string;
}