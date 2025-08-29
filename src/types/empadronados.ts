export interface Empadronado {
  id: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  placasVehiculares?: string;
  habilitado: boolean;
  telefono1?: string;
  telefono2?: string;
  telefono3?: string;
  fechaIngreso: number; // timestamp
  direccion: string;
  genero: 'masculino' | 'femenino';
  vive: boolean;
  estadoVivienda: 'construida' | 'construccion' | 'terreno';
  cumpleanos: string; // DD/MM/YYYY
  observaciones?: string;
  hijos?: string[]; // Array de nombres de hijos
  createdAt: number;
  updatedAt: number;
  creadoPor: string; // uid del usuario que lo creó
  modificadoPor?: string; // uid del último usuario que lo modificó
}

export interface CreateEmpadronadoForm {
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  placasVehiculares?: string;
  habilitado: boolean;
  telefono1?: string;
  telefono2?: string;
  telefono3?: string;
  fechaIngreso: number;
  direccion: string;
  genero: 'masculino' | 'femenino';
  vive: boolean;
  estadoVivienda: 'construida' | 'construccion' | 'terreno';
  cumpleanos: string;
  observaciones?: string;
  hijos?: string[];
}

export interface UpdateEmpadronadoForm extends Partial<CreateEmpadronadoForm> {}

export interface EmpadronadosStats {
  total: number;
  viven: number;
  construida: number;
  construccion: number;
  terreno: number;
  masculinos: number;
  femeninos: number;
  habilitados: number;
}

export interface DeleteEmpadronadoRequest {
  empadronadoId: string;
  clavePresidencia: string;
  actaPdf?: File;
  motivo: string;
}