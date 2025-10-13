// src/types/medios-pago.ts

export interface CuentaBancaria {
  id: string;
  nombreBanco: string;
  numeroCuenta: string;
  activo: boolean;
  orden: number;
}

export interface BilleteraDigital {
  id: string;
  nombreBilletera: string;
  numeroTelefono: string;
  activo: boolean;
  orden: number;
}

export interface ConfiguracionMediosPago {
  cuentasBancarias: CuentaBancaria[];
  billeterasDigitales: BilleteraDigital[];
  ultimaActualizacion: number;
  actualizadoPor?: string;
}
