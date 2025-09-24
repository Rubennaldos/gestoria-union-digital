// Tipos para el módulo de Acceso (Visitantes, Trabajadores, Proveedores)

export interface Visitante {
  id: string;
  nombre: string;
  dni: string;
  esMenor?: boolean;
}

export interface RegistroVisita {
  id: string;
  empadronadoId: string;
  tipoAcceso: 'vehicular' | 'peatonal';
  placa?: string;
  visitantes: Visitante[];
  menores: number;
  fechaCreacion: number;
  estado: 'pendiente' | 'autorizado' | 'denegado';
  esFavorito?: boolean;
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface MaestroObra {
  id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  empresa: string;
  sexo: 'masculino' | 'femenino';
  fotoDni?: string;
  autorizado: boolean;
  fechaAutorizacion?: number;
  autorizadoPor?: string;
}

export interface Trabajador {
  id: string;
  nombre: string;
  dni: string;
  esMaestroObra: boolean;
}

export interface RegistroTrabajadores {
  id: string;
  empadronadoId: string;
  tipoAcceso: 'vehicular' | 'peatonal';
  placa?: string;
  maestroObraId: string;
  trabajadores: Trabajador[];
  fechaCreacion: number;
  estado: 'pendiente' | 'autorizado' | 'denegado';
  esFavorito?: boolean;
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface RegistroProveedor {
  id: string;
  empadronadoId: string;
  tipoAcceso: 'vehicular' | 'peatonal';
  placa?: string;
  empresa: string;
  tipoServicio?: 'gas' | 'delivery' | 'otro';
  fechaCreacion: number;
  estado: 'pendiente' | 'autorizado' | 'denegado';
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface FavoritoUsuario {
  id: string;
  empadronadoId: string;
  tipo: 'visitante' | 'trabajador' | 'proveedor';
  nombre: string;
  datos: any;
  fechaCreacion: number;
}