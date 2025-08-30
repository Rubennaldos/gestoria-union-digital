export type EstadoReserva = 'pendiente' | 'pagado' | 'cancelado' | 'no-show' | 'completado';

export type MetodoPago = 'efectivo' | 'transferencia' | 'yape' | 'plin';

export type TipoCancha = 'futbol' | 'voley';

export interface Cancha {
  id: string;
  nombre: string;
  tipo: TipoCancha;
  ubicacion: 'boulevard' | 'quinta_llana';
  activa: boolean;
  configuracion: {
    precioHora: number;
    modificadorLuz: {
      '1h': number;
      '2h': number;
      '3h': number;
    };
    tarifaAportante: number; // Descuento para aportantes (porcentaje)
    horaMinima: number; // Duración mínima en horas
    horaMaxima: number; // Duración máxima en horas
    bufferMinutos: number; // Minutos entre reservas
    horarios: {
      inicio: string; // HH:mm
      fin: string; // HH:mm
    };
  };
}

export interface Reserva {
  id: string;
  canchaId: string;
  empadronadoId?: string;
  nombreCliente: string;
  dni?: string;
  telefono: string;
  fechaInicio: string; // ISO date
  fechaFin: string; // ISO date
  duracionHoras: number;
  estado: EstadoReserva;
  esAportante: boolean;
  precio: {
    base: number;
    luz: number;
    descuentoAportante: number;
    total: number;
  };
  pago?: {
    metodoPago: MetodoPago;
    numeroOperacion?: string;
    voucherUrl?: string;
    fechaPago?: string;
    esPrepago?: boolean;
    montoPrepago?: number;
    saldoPendiente?: number;
  };
  recurrente?: {
    esRecurrente: boolean;
    frecuencia: 'semanal' | 'quincenal' | 'mensual';
    fechaFin: string;
    reservasGeneradas: string[]; // IDs de las reservas generadas
  };
  observaciones?: string;
  comprobanteUrl?: string;
  ingresoId?: string; // Referencia al ingreso en cobranzas
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ConfiguracionDeportes {
  limitesReservas: {
    reservasPorPersonaPorDia: number;
    horasAntesParaCancelar: number;
    horasAntesParaNoShow: number;
  };
  notificaciones: {
    whatsappTemplate: string;
    recordatorioHoras: number[];
  };
  horarios: {
    apertura: string; // HH:mm
    cierre: string; // HH:mm
    ultimaReserva: string; // HH:mm (22:00 por ruido)
  };
  depositos: {
    requiereDeposito: boolean;
    montoDeposito: number;
    equipos: {
      red: boolean;
      pelotas: boolean;
      tableros: boolean;
    };
  };
}

export interface EventoEspecial {
  id: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  canchasReservadas: string[];
  esGratuito: boolean;
  tarifaEspecial?: number;
  activo: boolean;
}

export interface EstadisticasDeportes {
  reservasDelMes: number;
  ingresosTotales: number;
  canchasMasUsadas: {
    canchaId: string;
    nombre: string;
    reservas: number;
  }[];
  horariosPopulares: {
    hora: string;
    reservas: number;
  }[];
  ocupacionPromedio: number; // Porcentaje
}

export interface ComprobanteReserva {
  reservaId: string;
  numeroComprobante: string;
  fechaEmision: string;
  cliente: {
    nombre: string;
    dni?: string;
    telefono: string;
  };
  cancha: {
    nombre: string;
    ubicacion: string;
  };
  horario: {
    fecha: string;
    inicio: string;
    fin: string;
    duracion: number;
  };
  precio: {
    base: number;
    luz: number;
    descuentoAportante: number;
    total: number;
  };
  qrCode: string; // URL o data del QR
  observaciones?: string;
}

// Interfaces para el calendario y drag & drop
export interface EventoCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string; // canchaId
  estado: EstadoReserva;
  data: Reserva;
}

export interface RecursoCalendario {
  id: string;
  title: string;
  tipo: TipoCancha;
  ubicacion: string;
}

// Formularios
export interface FormReserva {
  canchaId: string;
  nombreCliente: string;
  dni?: string;
  telefono: string;
  fechaInicio: string;
  fechaFin: string;
  esAportante: boolean;
  observaciones?: string;
  recurrente?: {
    esRecurrente: boolean;
    frecuencia: 'semanal' | 'quincenal' | 'mensual';
    fechaFin: string;
  };
}

export interface FormPago {
  metodoPago: MetodoPago;
  numeroOperacion?: string;
  voucher?: File;
  esPrepago?: boolean;
  montoPrepago?: number;
}