// src/types/finanzas.ts

export type TipoMovimiento = "ingreso" | "egreso";

export type CategoriaIngreso = 
  | "cuotas"
  | "donacion"
  | "multa_externa"
  | "evento"
  | "alquiler"
  | "intereses"
  | "otro";

export type CategoriaEgreso = 
  | "mantenimiento"
  | "servicios"
  | "personal"
  | "seguridad"
  | "compras"
  | "eventos"
  | "reparaciones"
  | "otro";

export interface Comprobante {
  nombre: string;
  url: string;
  tipo: string; // image/jpeg, application/pdf, etc
  tamano: number;
  fechaSubida: number;
}

export interface MovimientoFinanciero {
  id: string;
  tipo: TipoMovimiento;
  categoria: CategoriaIngreso | CategoriaEgreso;
  monto: number;
  descripcion: string;
  fecha: string; // formato ISO
  comprobantes: Comprobante[];
  registradoPor: string;
  registradoPorNombre: string;
  numeroComprobante?: string;
  beneficiario?: string; // Para egresos
  proveedor?: string; // Para egresos
  observaciones?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ResumenCaja {
  saldoActual: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoEsperado: number; // Lo que debería haber según cobranzas
  diferencia: number;
  ultimaActualizacion: number;
}

export interface EstadisticasFinanzas {
  ingresosDelMes: number;
  egresosDelMes: number;
  balanceDelMes: number;
  ingresosDelAnio: number;
  egresosDelAnio: number;
  balanceDelAnio: number;
  topCategoriasEgreso: { categoria: string; total: number }[];
  topCategoriasIngreso: { categoria: string; total: number }[];
}
