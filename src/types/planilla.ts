export interface HorarioAcceso {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  horaInicio: string; // HH:mm formato 24h
  horaFin: string; // HH:mm formato 24h
  activo: boolean;
}

export interface PersonalPlanilla {
  id: string;
  empadronadoId: string; // ID del empadronado o personal de seguridad
  nombreCompleto: string; // calculado desde empadronado
  dni: string; // desde empadronado
  tipoPersonal: 'residente' | 'personal_seguridad';
  
  // Datos laborales
  funcion: string; // Ej: "Guardia de seguridad", "Personal de limpieza", etc.
  areaAsignada?: string;
  fechaContratacion: number; // timestamp
  activo: boolean;
  
  // Control de accesos al sistema
  tieneAccesoSistema: boolean;
  horariosAcceso: HorarioAcceso[]; // horarios en los que puede ingresar al sistema
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  creadoPor: string; // uid del usuario
  modificadoPor?: string;
}

export interface CreatePersonalPlanillaForm {
  empadronadoId: string;
  funcion: string;
  areaAsignada?: string;
  fechaContratacion: number;
  activo: boolean;
  tieneAccesoSistema: boolean;
  horariosAcceso: HorarioAcceso[];
}

export interface UpdatePersonalPlanillaForm extends Partial<CreatePersonalPlanillaForm> {}

export interface PlanillaStats {
  totalPersonal: number;
  activos: number;
  inactivos: number;
  conAccesoSistema: number;
  residentes: number;
  personalSeguridad: number;
}
