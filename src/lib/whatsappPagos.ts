import { ref, get, set } from "firebase/database";
import { db } from "@/config/firebase";

interface ConfigWhatsAppPagos {
  numero1: string;
  numero2: string;
  mensajePredeterminado: string;
}

export async function getConfigWhatsAppPagos(): Promise<ConfigWhatsAppPagos | null> {
  try {
    const configRef = ref(db, "configuracion/whatsapp_pagos");
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error al obtener configuración de WhatsApp Pagos:", error);
    return null;
  }
}

export async function guardarConfigWhatsAppPagos(config: ConfigWhatsAppPagos): Promise<void> {
  try {
    const configRef = ref(db, "configuracion/whatsapp_pagos");
    await set(configRef, config);
  } catch (error) {
    console.error("Error al guardar configuración de WhatsApp Pagos:", error);
    throw error;
  }
}

interface DetallesPago {
  asociado: string;
  padron: string;
  monto: number;
  periodos: string[];
  metodoPago: string;
  numeroOperacion: string;
  fechaPago: string;
}

export function generarMensajePago(detalles: DetallesPago, mensajeBase: string): string {
  const periodosFormateados = detalles.periodos.map(p => {
    const year = p.substring(0, 4);
    const month = parseInt(p.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  }).join(", ");

  return mensajeBase
    .replace("{asociado}", detalles.asociado)
    .replace("{padron}", detalles.padron)
    .replace("{monto}", `S/ ${detalles.monto.toFixed(2)}`)
    .replace("{periodos}", periodosFormateados)
    .replace("{metodoPago}", detalles.metodoPago)
    .replace("{numeroOperacion}", detalles.numeroOperacion)
    .replace("{fechaPago}", detalles.fechaPago);
}

export function abrirWhatsAppPago(numeroDestino: string, mensaje: string): void {
  const numeroLimpio = numeroDestino.replace(/\D/g, "");
  const numeroCompleto = numeroLimpio.startsWith("51") ? numeroLimpio : `51${numeroLimpio}`;
  const mensajeCodificado = encodeURIComponent(mensaje);
  const url = `https://wa.me/${numeroCompleto}?text=${mensajeCodificado}`;
  window.open(url, "_blank");
}

// Abre WhatsApp para ambos números secuencialmente
export function enviarNotificacionPagoWhatsApp(
  config: ConfigWhatsAppPagos,
  detalles: DetallesPago
): void {
  const mensaje = generarMensajePago(detalles, config.mensajePredeterminado);
  
  // Abrir primer número
  if (config.numero1) {
    abrirWhatsAppPago(config.numero1, mensaje);
  }
  
  // Abrir segundo número con un pequeño delay
  if (config.numero2) {
    setTimeout(() => {
      abrirWhatsAppPago(config.numero2, mensaje);
    }, 1000);
  }
}
