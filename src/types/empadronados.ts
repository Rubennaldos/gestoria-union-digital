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

/**
 * Tipo de fila devuelta por Supabase (snake_case).
 * Usado internamente en empadronados.ts para el mapeo DB ↔ dominio.
 * Los componentes de React usan siempre `Empadronado` (camelCase).
 */
export interface EmpadronadoRow {
  id: string;                    // UUID generado por PostgreSQL
  numero_padron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  miembros_familia: unknown[];
  vehiculos: unknown[];
  telefonos: unknown[];
  habilitado: boolean;
  anulado: boolean;
  observaciones: string | null;
  fecha_ingreso: string | null;  // ISO timestamptz
  manzana: string | null;
  lote: string | null;
  etapa: string | null;
  genero: string;
  vive: boolean;
  estado_vivienda: string;
  cumpleanos: string | null;     // YYYY-MM-DD (columna date de PG)
  created_at: string;
  updated_at: string;
  creado_por: string | null;
  modificado_por: string | null;
  auth_uid: string | null;
  email_acceso: string | null;
}

export interface Empadronado {
  /** UUID de Supabase (antes era la push-key de Firebase RTDB) */
  id: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  miembrosFamilia?: FamilyMember[];
  vehiculos?: Vehicle[];
  habilitado: boolean;
  anulado?: boolean; // Padrón anulado (fantasma) - no genera cargos ni aparece en balances
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
  
  /** Vínculo con cuenta del sistema (Supabase Auth) */
  authUid?: string;        // UUID de Supabase Auth (columna auth_uid en DB)
  emailAcceso?: string;    // email con el que accede (columna email_acceso en DB)
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