// Firebase RTDB Types for the neighborhood association system

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  telefono: string;
  etapa: string;
  rol: 'presidencia' | 'vicepresidencia' | 'seguridad' | 'economia' | 'actas' | 'recreacion' | 'comunicaciones' | 'salud' | 'educacion' | 'fiscal' | 'vocal';
  permisos: {
    [modulo: string]: {
      ver: boolean;
      crear: boolean;
      editar: boolean;
      aprobar: boolean;
    };
  };
  activo: boolean;
  fechaCreacion: string;
  ultimoAcceso: string;
}

export interface Sesion {
  id: string;
  tipo: 'ordinaria' | 'extraordinaria' | 'asamblea';
  fecha: string;
  hora: string;
  lugar: string;
  agenda: string[];
  quorum: {
    requerido: number;
    presente: number;
    alcanzado: boolean;
  };
  asistentes: {
    [uid: string]: {
      presente: boolean;
      hora_llegada: string;
    };
  };
  acuerdos: Acuerdo[];
  estado: 'programada' | 'en_curso' | 'finalizada';
  convocatoria_enviada: boolean;
  fecha_convocatoria: string;
}

export interface Acuerdo {
  id: string;
  sesion_id: string;
  numero: number;
  descripcion: string;
  votos: {
    favor: number;
    contra: number;
    abstencion: number;
  };
  votantes: {
    [uid: string]: 'favor' | 'contra' | 'abstencion';
  };
  estado: 'aprobado' | 'rechazado';
  fecha_vencimiento?: string;
  responsable?: string;
}

export interface Finanza {
  id: string;
  tipo: 'ingreso' | 'egreso';
  concepto: string;
  monto: number;
  fecha: string;
  asociado_id?: string; // Para cuotas
  voucher_numero?: string;
  banco?: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'deposito';
  categoria: string;
  comprobante_numero?: string;
  aprobado_por?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface Cuota {
  id: string;
  asociado_id: string;
  año: number;
  mes: number;
  monto: number;
  tipo: 'ordinaria' | 'extraordinaria';
  fecha_vencimiento: string;
  estado: 'pendiente' | 'pagada' | 'vencida';
  fecha_pago?: string;
  voucher_numero?: string;
}

export interface IncidenteSeguridad {
  id: string;
  tipo: 'robo' | 'vandalismo' | 'emergencia' | 'sospechoso' | 'otro';
  descripcion: string;
  ubicacion: string;
  etapa: string;
  fecha: string;
  hora: string;
  reportado_por: string;
  estado: 'abierto' | 'en_investigacion' | 'cerrado';
  acciones_tomadas?: string;
  seguimiento: {
    fecha: string;
    descripcion: string;
    responsable: string;
  }[];
}

export interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  tipo: 'informativo' | 'urgente' | 'convocatoria';
  publico_objetivo: 'todos' | 'junta' | 'delegados' | 'etapa_especifica';
  etapas?: string[];
  fecha_publicacion: string;
  publicado_por: string;
  lecturas: {
    [uid: string]: {
      leido: boolean;
      fecha_lectura: string;
    };
  };
  estado: 'borrador' | 'publicado' | 'archivado';
}

export interface Alert {
  id: string;
  tipo: 'cuota_vencida' | 'sesion_proxima' | 'quorum_faltante' | 'incidente_seguridad' | 'comunicado_urgente';
  titulo: string;
  mensaje: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fecha: string;
  destinatario_uid?: string; // Si es específica para un usuario
  etapa?: string; // Si es específica para una etapa
  leida: boolean;
  accion_requerida?: string;
  enlace?: string; // Para navegar al módulo relevante
}