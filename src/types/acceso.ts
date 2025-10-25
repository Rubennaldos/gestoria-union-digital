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
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[]; // Múltiples placas
  visitantes: Visitante[];
  menores: number;
  fechaCreacion: number;
  estado: "pendiente" | "autorizado" | "denegado";
  esFavorito?: boolean;

  /** Snapshot para mostrar en Seguridad sin lookups */
  solicitadoPorNombre?: string;
  solicitadoPorPadron?: string;

  /** Compatibilidad con tu modelo previo */
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface MaestroObra {
  id: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  empresa?: string;
  notas?: string;
  activo?: boolean;
  creadoPorUid?: string;
  createdAt?: number;
  updatedAt?: number;
  
  // Campos legacy (mantener por compatibilidad)
  apellidos?: string;
  sexo?: "masculino" | "femenino";
  fotoDni?: string;
  autorizado?: boolean;
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
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[]; // Múltiples placas
  maestroObraId: string;
  maestroObraTemporal?: { nombre: string; dni: string }; // Datos temporales del encargado
  trabajadores: Trabajador[];
  fechaCreacion: number;
  estado: "pendiente" | "autorizado" | "denegado";
  esFavorito?: boolean;

  /** Snapshot para Seguridad */
  solicitadoPorNombre?: string;
  solicitadoPorPadron?: string;

  /** Compatibilidad */
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface RegistroProveedor {
  id: string;
  empadronadoId: string;
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[]; // Múltiples placas
  empresa: string;
  tipoServicio?: "gas" | "delivery" | "bodega" | "otro";
  fechaCreacion: number;
  estado: "pendiente" | "autorizado" | "denegado";

  /** Snapshot para Seguridad */
  solicitadoPorNombre?: string;
  solicitadoPorPadron?: string;

  /** Compatibilidad */
  vecinoSolicitante?: {
    nombre: string;
    numeroPadron: string;
  };
}

export interface FavoritoUsuario {
  id: string;
  empadronadoId: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  nombre: string;
  datos: any;
  fechaCreacion: number;
}

export interface ListaTrabajadoresRecurrente {
  id: string;
  empadronadoId: string;
  nombreLista: string;
  maestroObraId: string;
  tipoAcceso: "vehicular" | "peatonal";
  placa?: string;
  placas?: string[];
  trabajadores: Trabajador[];
  fechaInicio: number; // timestamp
  fechaFin: number; // timestamp (máximo 30 días desde inicio)
  activa?: boolean;
  createdAt: number;
  updatedAt?: number;
  
  // Snapshot para mostrar en Seguridad
  solicitadoPorNombre?: string;
  solicitadoPorPadron?: string;
}
