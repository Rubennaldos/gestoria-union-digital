export interface FamilyMember {
  nombre: string;
  apellidos: string;
  parentezco: string;
  cumpleanos: string; // DD/MM/YYYY
}

export interface PhoneNumber {
  numero: string;
}

export interface Vehicle {
  placa: string;
  tipo: 'vehiculo' | 'moto';
}

export interface Empadronado {
  id: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  miembrosFamilia?: FamilyMember[];
  vehiculos?: Vehicle[];
  habilitado: boolean;
  telefonos?: PhoneNumber[];
  fechaIngreso: number; // timestamp
  manzana?: string;
  lote?: string;
  etapa?: string;
  genero: 'masculino' | 'femenino';
  vive: boolean;
  estadoVivienda: 'construida' | 'construccion' | 'terreno';
  cumpleanos: string; // DD/MM/YYYY
  observaciones?: string;
  createdAt: number;
  updatedAt: number;
  creadoPor: string; // uid del usuario que lo creó
  modificadoPor?: string; // uid del último usuario que lo modificó

  /** NUEVO: tipo de registro para diferenciar residentes de personal */
  tipoRegistro?: 'residente' | 'personal_seguridad';
  
  /** Campos específicos para personal de seguridad */
  telefonosEmergencia?: PhoneNumber[];
  tipoSangre?: string;
  direccionDomicilio?: string;
  documentoDniFrontal?: string; // URL del archivo en storage
  documentoDniReverso?: string; // URL del archivo en storage
  documentoReciboLuz?: string; // URL del archivo en storage
  exentoCobroMensual?: boolean; // Si no aplica cobro mensual
  
  /** NUEVO: vínculo con cuenta del sistema */
  authUid?: string;        // UID de Firebase Auth si tiene cuenta
  emailAcceso?: string;    // email con el que accede
}

export interface CreateEmpadronadoForm {
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  miembrosFamilia?: FamilyMember[];
  vehiculos?: Vehicle[];
  habilitado: boolean;
  telefonos?: PhoneNumber[];
  fechaIngreso: number;
  manzana?: string;
  lote?: string;
  etapa?: string;
  genero: 'masculino' | 'femenino';
  vive: boolean;
  estadoVivienda: 'construida' | 'construccion' | 'terreno';
  cumpleanos: string;
  observaciones?: string;
  tipoRegistro?: 'residente' | 'personal_seguridad';
  
  // Campos para personal de seguridad
  telefonosEmergencia?: PhoneNumber[];
  tipoSangre?: string;
  direccionDomicilio?: string;
  exentoCobroMensual?: boolean;
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