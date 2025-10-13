// src/services/medios-pago.ts
import { ref, get, set } from "firebase/database";
import { db } from "@/config/firebase";
import { ConfiguracionMediosPago, CuentaBancaria, BilleteraDigital } from "@/types/medios-pago";

const MEDIOS_PAGO_PATH = "configuracion/mediosPago";

// Obtener configuración de medios de pago
export async function obtenerMediosPago(): Promise<ConfiguracionMediosPago> {
  const mediosRef = ref(db, MEDIOS_PAGO_PATH);
  const snapshot = await get(mediosRef);
  
  if (!snapshot.exists()) {
    // Retornar configuración por defecto
    return {
      cuentasBancarias: [],
      billeterasDigitales: [],
      ultimaActualizacion: Date.now(),
    };
  }
  
  return snapshot.val();
}

// Guardar configuración de medios de pago
export async function guardarMediosPago(
  configuracion: Omit<ConfiguracionMediosPago, "ultimaActualizacion">,
  usuarioId?: string
): Promise<void> {
  const mediosRef = ref(db, MEDIOS_PAGO_PATH);
  
  const datosGuardar: ConfiguracionMediosPago = {
    ...configuracion,
    ultimaActualizacion: Date.now(),
    ...(usuarioId && { actualizadoPor: usuarioId }),
  };
  
  await set(mediosRef, datosGuardar);
}

// Agregar cuenta bancaria
export async function agregarCuentaBancaria(
  cuenta: Omit<CuentaBancaria, "id" | "orden">,
  usuarioId?: string
): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  const nuevaCuenta: CuentaBancaria = {
    ...cuenta,
    id: Date.now().toString(),
    orden: configuracion.cuentasBancarias.length,
  };
  
  configuracion.cuentasBancarias.push(nuevaCuenta);
  
  await guardarMediosPago(configuracion, usuarioId);
}

// Actualizar cuenta bancaria
export async function actualizarCuentaBancaria(
  id: string,
  updates: Partial<Omit<CuentaBancaria, "id">>,
  usuarioId?: string
): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  const index = configuracion.cuentasBancarias.findIndex(c => c.id === id);
  if (index === -1) throw new Error("Cuenta bancaria no encontrada");
  
  configuracion.cuentasBancarias[index] = {
    ...configuracion.cuentasBancarias[index],
    ...updates,
  };
  
  await guardarMediosPago(configuracion, usuarioId);
}

// Eliminar cuenta bancaria
export async function eliminarCuentaBancaria(id: string, usuarioId?: string): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  configuracion.cuentasBancarias = configuracion.cuentasBancarias.filter(c => c.id !== id);
  
  await guardarMediosPago(configuracion, usuarioId);
}

// Agregar billetera digital
export async function agregarBilleteraDigital(
  billetera: Omit<BilleteraDigital, "id" | "orden">,
  usuarioId?: string
): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  const nuevaBilletera: BilleteraDigital = {
    ...billetera,
    id: Date.now().toString(),
    orden: configuracion.billeterasDigitales.length,
  };
  
  configuracion.billeterasDigitales.push(nuevaBilletera);
  
  await guardarMediosPago(configuracion, usuarioId);
}

// Actualizar billetera digital
export async function actualizarBilleteraDigital(
  id: string,
  updates: Partial<Omit<BilleteraDigital, "id">>,
  usuarioId?: string
): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  const index = configuracion.billeterasDigitales.findIndex(b => b.id === id);
  if (index === -1) throw new Error("Billetera digital no encontrada");
  
  configuracion.billeterasDigitales[index] = {
    ...configuracion.billeterasDigitales[index],
    ...updates,
  };
  
  await guardarMediosPago(configuracion, usuarioId);
}

// Eliminar billetera digital
export async function eliminarBilleteraDigital(id: string, usuarioId?: string): Promise<void> {
  const configuracion = await obtenerMediosPago();
  
  configuracion.billeterasDigitales = configuracion.billeterasDigitales.filter(b => b.id !== id);
  
  await guardarMediosPago(configuracion, usuarioId);
}
