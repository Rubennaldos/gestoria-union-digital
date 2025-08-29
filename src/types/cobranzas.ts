// src/types/cobranzas.ts

/* ──────────────────────────────────────────────────────────
   Tipos base
   ────────────────────────────────────────────────────────── */

export type MetodoPago = 'efectivo' | 'transferencia' | 'yape' | 'plin';

/* ──────────────────────────────────────────────────────────
   Pagos de cuotas (ligados a empadronados/periodos)
   ────────────────────────────────────────────────────────── */

export interface Pago {
  id: string;
  empadronadoId: string;
  numeroPadron: string;
  mes: number; // 1-12
  año: number;
  monto: number; // monto final (descuentos/recargos aplicados)
  montoOriginal: number; // monto base de la cuota
  fechaVencimiento: string; // DD/MM/YYYY
  fechaPago?: string; // DD/MM/YYYY
  estado: 'pendiente' | 'pagado' | 'moroso' | 'sancionado';
  metodoPago?: MetodoPago;
  numeroOperacion?: string;
  comprobantePago?: string; // URL/BASE64 del archivo
  observaciones?: string;
  descuentos?: Descuento[];
  recargos?: Recargo[];
  createdAt: number;
  updatedAt: number;
  creadoPor: string;
  pagadoPor?: string;
}

export interface Descuento {
  id: string;
  tipo: 'pronto_pago' | 'declaracion_jurada';
  porcentaje: number;
  monto: number;
  motivo?: string;
  documentoAprobacion?: string; // URL del PDF
  aprobadoPor?: string;
  fechaAprobacion?: string;
  activo: boolean;
}

export interface Recargo {
  id: string;
  tipo: 'morosidad' | 'sancion';
  porcentaje: number;
  monto: number;
  motivo?: string;
  documentoAprobacion?: string; // URL del PDF de sanción firmado
  aplicadoPor?: string;
  fechaAplicacion?: string;
  activo: boolean;
}

/* ──────────────────────────────────────────────────────────
   Ingresos libres (donaciones, eventos, alquileres, etc.)
   NO están ligados a cuotas ni a empadronados
   ────────────────────────────────────────────────────────── */

export interface Ingreso {
  id: string;
  concepto: string;                                // p.ej. "Donación cancha", "Evento", "Alquiler local"
  categoria: 'donacion' | 'evento' | 'alquiler' | 'otros';
  monto: number;
  fecha: string;                                   // DD/MM/YYYY
  metodoPago?: MetodoPago | null;
  numeroOperacion?: string | null;
  archivoUrl?: string | null;                      // comprobante (PDF/imagen) opcional
  registradoPor?: string;                          // uid del usuario que lo registró
  createdAt: number;
  updatedAt: number;
}

/* ──────────────────────────────────────────────────────────
   Egresos
   ────────────────────────────────────────────────────────── */

export interface Egreso {
  id: string;
  concepto: string;
  monto: number;
  fecha: string; // DD/MM/YYYY
  categoria: string;
  estado: 'nuevo' | 'usado';
  comprobante: string; // URL del archivo
  realizadoPor: string;
  aprobadoPor?: string;
  observaciones?: string;
  createdAt: number;
  updatedAt: number;
}

/* ──────────────────────────────────────────────────────────
   Configuración y estadísticas
   ────────────────────────────────────────────────────────── */

export interface ConfiguracionCobranzas {
  montoMensual: number;
  diaVencimiento: number;      // 15
  diaCierre: number;           // 14
  diasProntoPago: number;      // 3
  porcentajeProntoPago: number;
  porcentajeMorosidad: number;
  porcentajeSancion: number;
  serieComprobantes: string;
  numeroComprobanteActual: number;
  sede: string;
}

export interface EstadisticasCobranzas {
  totalEmpadronados: number;
  totalRecaudado: number; // cuotas cobradas + ingresos libres (acumulado)
  totalPendiente: number; // sólo de cuotas
  totalMorosos: number;   // sólo de cuotas
  tasaCobranza: number;   // sólo de cuotas
  ingresosMes: number;    // ingresos del mes (ingresos libres + cobranzas del mes si así se decide)
  egresosMes: number;
  saldoActual: number;
}

/* ──────────────────────────────────────────────────────────
   Reportes / comprobantes
   ────────────────────────────────────────────────────────── */

export interface ReporteCobranza {
  empadronadoId: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  manzana?: string;
  lote?: string;
  totalDeuda: number;
  ultimoPago?: string;
  mesesMorosos: number;
  estado: string;
}

export interface ComprobanteEmision {
  numero: string;
  serie: string;
  fecha: string;
  empadronado: string;
  concepto: string;
  monto: number;
  firmadoPor: string;
}

/* ──────────────────────────────────────────────────────────
   Declaraciones juradas y sanciones
   ────────────────────────────────────────────────────────── */

export interface DeclaracionJurada {
  id: string;
  empadronadoId: string;
  tipoDescuento: string;
  porcentajeDescuento: number;
  motivo: string;
  archivo: string; // URL del PDF
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fechaSolicitud: string;
  fechaAprobacion?: string;
  aprobadoPorPresidente?: boolean;
  aprobadoPorFiscal?: boolean;
  observaciones?: string;
}

export interface PlantillaSancion {
  id: string;
  empadronadoId: string;
  tipoSancion: string;
  montoSancion: number;
  motivo: string;
  archivo: string; // URL del PDF firmado
  aplicadoPor: string;
  fechaAplicacion: string;
}
