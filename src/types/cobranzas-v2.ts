// Tipos para el módulo de Cobranzas V2 (Mensual)

export interface ConfiguracionCobranzasV2 {
  montoMensual: number;
  diaCierre: number;
  diaVencimiento: number;
  diasProntoPago: number;
  porcentajeProntoPago: number;
  porcentajeMorosidad: number;
  serieComprobantes: string;
  numeroComprobanteActual: number;
  sede: string;
}

export interface ChargeV2 {
  id: string;
  empadronadoId: string;
  periodo: string; // YYYYMM
  montoOriginal: number;
  montoPagado: number;
  saldo: number;
  fechaVencimiento: number;
  fechaCreacion: number;
  estado: 'pendiente' | 'pagado' | 'moroso';
  esMoroso: boolean;
  montoMorosidad?: number;
}

export interface PagoV2 {
  id: string;
  chargeId: string;
  empadronadoId: string;
  periodo: string; // YYYYMM
  monto: number;
  montoOriginal: number;
  descuentoProntoPago?: number;
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  numeroOperacion?: string;
  fechaPagoRegistrada: number; // Fecha que el usuario indica que pagó
  fechaCreacion: number; // Fecha que se registró en el sistema
  fechaModificacion?: number; // Fecha de última modificación
  observaciones?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  archivoComprobante?: string; // URL del archivo adjunto
  motivoRechazo?: string;
  aprobadoPor?: string;
  fechaAprobacion?: number;
  comentarioAprobacion?: string;
  fechaRechazo?: number;
}

export interface IngresoV2 {
  id: string;
  concepto: string;
  monto: number;
  fecha: number;
  categoria: string;
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  numeroOperacion?: string;
  observaciones?: string;
}

export interface EgresoV2 {
  id: string;
  concepto: string;
  monto: number;
  fecha: number;
  categoria: string;
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  numeroOperacion?: string;
  observaciones?: string;
}

export interface EstadisticasV2 {
  recaudadoMes: number;
  pendienteTotal: number;
  morosos: number;
  tasaCobranza: number;
  ingresosMes: number;
  egresosMes: number;
  saldoMes: number;
  totalEmpadronados: number;
  cargosMesPagados: number;
  cargosMesTotal: number;
}

export interface PeriodLock {
  generated: boolean;
  fechaGeneracion: number;
  generadoPor: string;
}

export interface PagoIndex {
  chargeId: string;
  fechaPago: number;
}