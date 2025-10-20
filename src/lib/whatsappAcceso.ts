import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";

interface ConfigWhatsApp {
  numero: string;
  mensajePredeterminado: string;
}

export async function getConfigWhatsApp(): Promise<ConfigWhatsApp | null> {
  try {
    const configRef = ref(db, "configuracion/whatsapp_accesos");
    const snapshot = await get(configRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error al obtener configuración de WhatsApp:", error);
    return null;
  }
}

interface DetallesSolicitud {
  tipo: "visita" | "trabajador" | "proveedor";
  tipoAcceso: string;
  placas?: string[];
  personas?: Array<{ nombre: string; dni: string }>;
  empresa?: string;
  tipoServicio?: string;
  maestro?: { nombre: string; dni: string };
}

export function generarDetallesSolicitud(detalles: DetallesSolicitud): string {
  const lineas: string[] = [];
  
  // Tipo de solicitud
  lineas.push(`Tipo: ${detalles.tipo.charAt(0).toUpperCase() + detalles.tipo.slice(1)}`);
  lineas.push(`Acceso: ${detalles.tipoAcceso}`);
  
  // Placas si existen
  if (detalles.placas && detalles.placas.length > 0) {
    lineas.push(`Placa(s): ${detalles.placas.join(", ")}`);
  }
  
  // Detalles específicos por tipo
  if (detalles.tipo === "visita" && detalles.personas) {
    lineas.push(`\nVisitantes (${detalles.personas.length}):`);
    detalles.personas.forEach((p, i) => {
      lineas.push(`${i + 1}. ${p.nombre} - ${p.dni}`);
    });
  } else if (detalles.tipo === "trabajador") {
    if (detalles.maestro) {
      lineas.push(`\nMaestro: ${detalles.maestro.nombre} - ${detalles.maestro.dni}`);
    }
    if (detalles.personas && detalles.personas.length > 0) {
      lineas.push(`\nTrabajadores (${detalles.personas.length}):`);
      detalles.personas.forEach((p, i) => {
        lineas.push(`${i + 1}. ${p.nombre} - ${p.dni}`);
      });
    }
  } else if (detalles.tipo === "proveedor") {
    if (detalles.empresa) {
      lineas.push(`Empresa: ${detalles.empresa}`);
    }
    if (detalles.tipoServicio) {
      lineas.push(`Servicio: ${detalles.tipoServicio}`);
    }
    if (detalles.personas && detalles.personas.length > 0) {
      lineas.push(`\nPersonal (${detalles.personas.length}):`);
      detalles.personas.forEach((p, i) => {
        lineas.push(`${i + 1}. ${p.nombre} - ${p.dni}`);
      });
    }
  }
  
  return lineas.join("\n");
}

export function abrirWhatsApp(numeroDestino: string, mensaje: string) {
  const numeroLimpio = numeroDestino.replace(/\D/g, "");
  const numeroCompleto = numeroLimpio.startsWith("51") ? numeroLimpio : `51${numeroLimpio}`;
  const mensajeCodificado = encodeURIComponent(mensaje);
  const url = `https://wa.me/${numeroCompleto}?text=${mensajeCodificado}`;
  window.open(url, "_blank");
}
